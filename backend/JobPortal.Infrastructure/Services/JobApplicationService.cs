using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JobPortal.Infrastructure.Services;

public class JobApplicationService : IJobApplicationService
{
    private readonly AppDbContext _db;
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IConfiguration _config;
    private readonly IAuditService _audit;

    public JobApplicationService(AppDbContext db, IBackgroundTaskQueue taskQueue, IConfiguration config, IAuditService audit)
    {
        _db = db;
        _taskQueue = taskQueue;
        _config = config;
        _audit = audit;
    }

    public async Task<ServiceResult<MyApplicationDto>> ApplyAsync(string applicantUserId, int employerJobId, ApplyToJobRequest request)
    {
        var job = await _db.EmployerJobs.FirstOrDefaultAsync(j => j.Id == employerJobId && j.IsActive);
        if (job is null) return ServiceResult<MyApplicationDto>.Fail("NotFound", "This job posting is no longer available.");

        var alreadyApplied = await _db.JobApplications.AnyAsync(a => a.EmployerJobId == employerJobId && a.ApplicantUserId == applicantUserId);
        if (alreadyApplied) return ServiceResult<MyApplicationDto>.Fail("AlreadyApplied", "You have already applied to this job.");

        var applicant = await _db.AspNetUsers.FindAsync(applicantUserId);
        if (applicant is null) return ServiceResult<MyApplicationDto>.Fail("NotFound", "User not found.");

        // Employers rely on the attached résumé to screen — don't let an application through without one.
        if (string.IsNullOrWhiteSpace(applicant.Resume))
            return ServiceResult<MyApplicationDto>.Fail("ResumeRequired",
                "Upload your résumé from your profile before applying to jobs.");

        var entity = new JobApplication
        {
            EmployerJobId = employerJobId,
            ApplicantUserId = applicantUserId,
            CoverLetter = request.CoverLetter,
            ResumeUrl = applicant.Resume,
            ExpectedSalary = request.ExpectedSalary,
            CurrentSalary = request.CurrentSalary,
            NoticePeriod = request.NoticePeriod,
            Status = ApplicationStatuses.Applied,
            IsRead = false,
            IsStarred = false,
            IsActive = true,
            CreatedDate = DateTime.UtcNow,
        };
        _db.JobApplications.Add(entity);

        job.ApplicationCount += 1;

        var profile = await _db.EmployerProfiles.FindAsync(job.EmployerProfileId);
        if (profile is not null) profile.TotalApplicationsReceived += 1;

        await _db.SaveChangesAsync();

        var applicantName = $"{applicant.FirstName} {applicant.LastName}".Trim();
        EnqueueEmployerNotification(profile?.ContactEmail, job.Title, applicantName);

        await _audit.LogAsync(new AuditEntry
        {
            EventType = AuditEventTypes.JobApplicationSubmitted,
            Category = AuditEventTypes.Categories.Employer,
            Summary = $"Job application submitted for \"{job.Title}\" at {profile?.CompanyName ?? "—"} by {(applicantName.Length > 0 ? applicantName : applicant.Email)}",
            ActorUserId = applicantUserId,
            ActorEmail = applicant.Email,
            ActorRole = "aspirant",
            TargetType = "JobApplication",
            TargetId = entity.Id.ToString(),
            Metadata = new { employerJobId, jobTitle = job.Title, companyName = profile?.CompanyName },
        });

        return ServiceResult<MyApplicationDto>.Ok(new MyApplicationDto
        {
            Id = entity.Id,
            EmployerJobId = job.Id,
            JobTitle = job.Title,
            JobSlug = job.Slug,
            CompanyName = profile?.CompanyName ?? "—",
            Status = entity.Status,
            CreatedDate = entity.CreatedDate,
        });
    }

    private void EnqueueEmployerNotification(string? toEmail, string jobTitle, string applicantName)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return;
        var dashboardUrl = (_config["App:FrontendBaseUrl"] ?? "http://localhost:3000").TrimEnd('/') + "/dashboard/employer";
        var subject = $"New application: {jobTitle}";
        var body = $"{applicantName} has applied to your posting \"{jobTitle}\".\n\n" +
                   $"Review the application (résumé, cover letter, expected salary) from your dashboard: {dashboardUrl}";
        _taskQueue.QueueBackgroundWorkItem(async (sp, ct) =>
        {
            var sender = sp.GetRequiredService<IEmailSender>();
            await sender.SendAsync(toEmail, subject, body);
        });
    }

    public async Task<List<MyApplicationDto>> GetMineAsync(string applicantUserId)
    {
        var applications = await _db.JobApplications.AsNoTracking()
            .Include(a => a.EmployerJob).ThenInclude(j => j.EmployerProfile)
            .Where(a => a.ApplicantUserId == applicantUserId)
            .OrderByDescending(a => a.CreatedDate)
            .ToListAsync();

        return applications.Select(a => new MyApplicationDto
        {
            Id = a.Id,
            EmployerJobId = a.EmployerJobId,
            JobTitle = a.EmployerJob.Title,
            JobSlug = a.EmployerJob.Slug,
            CompanyName = a.EmployerJob.EmployerProfile.CompanyName,
            Status = a.Status,
            InterviewDate = a.InterviewDate,
            InterviewLocation = a.InterviewLocation,
            InterviewMode = a.InterviewMode,
            CreatedDate = a.CreatedDate,
        }).ToList();
    }

    public async Task<ServiceResult<List<JobApplicationDto>>> GetForEmployerJobAsync(int employerProfileId, int employerJobId)
    {
        var job = await _db.EmployerJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == employerJobId && j.EmployerProfileId == employerProfileId);
        if (job is null) return ServiceResult<List<JobApplicationDto>>.Fail("NotFound", "Job posting not found.");

        var applications = await _db.JobApplications
            .Include(a => a.ApplicantUser)
            .Where(a => a.EmployerJobId == employerJobId)
            .OrderByDescending(a => a.CreatedDate)
            .ToListAsync();

        // Mark as read now that the employer is viewing them, and — only for applications still
        // sitting at the initial Applied stage — advance Status to Under Review too, matching the
        // real hiring-flow lifecycle. Never touches one already Shortlisted/Interview/Selected/Rejected.
        var touched = false;
        foreach (var a in applications.Where(a => !a.IsRead))
        {
            a.IsRead = true;
            if (a.Status == ApplicationStatuses.Applied) a.Status = ApplicationStatuses.UnderReview;
            touched = true;
        }
        if (touched) await _db.SaveChangesAsync();

        var dtos = applications.Select(a => ToDto(a, job.Title)).ToList();
        return ServiceResult<List<JobApplicationDto>>.Ok(dtos);
    }

    public async Task<ServiceResult<JobApplicationDto>> UpdateStatusAsync(int employerProfileId, int applicationId, UpdateApplicationStatusRequest request)
    {
        if (!ApplicationStatuses.EmployerSettable.Contains(request.Status))
        {
            return ServiceResult<JobApplicationDto>.Fail("InvalidStatus",
                $"Status must be one of: {string.Join(", ", ApplicationStatuses.EmployerSettable)}.");
        }

        var application = await _db.JobApplications.Include(a => a.EmployerJob)
            .FirstOrDefaultAsync(a => a.Id == applicationId);
        if (application is null || application.EmployerJob.EmployerProfileId != employerProfileId)
            return ServiceResult<JobApplicationDto>.Fail("NotFound", "Application not found.");

        application.Status = request.Status;
        application.EmployerNotes = request.EmployerNotes;
        application.InterviewDate = request.InterviewDate;
        application.InterviewLocation = request.InterviewLocation;
        application.InterviewMode = request.InterviewMode;
        application.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var saved = await _db.JobApplications.AsNoTracking().Include(a => a.ApplicantUser)
            .FirstAsync(a => a.Id == applicationId);
        return ServiceResult<JobApplicationDto>.Ok(ToDto(saved, application.EmployerJob.Title));
    }

    private static JobApplicationDto ToDto(JobApplication a, string jobTitle) => new()
    {
        Id = a.Id,
        EmployerJobId = a.EmployerJobId,
        JobTitle = jobTitle,
        ApplicantName = $"{a.ApplicantUser.FirstName} {a.ApplicantUser.LastName}".Trim(),
        ApplicantEmail = a.ApplicantUser.Email ?? "",
        ApplicantPhone = a.ApplicantUser.PhoneNumber,
        ResumeUrl = a.ResumeUrl,
        CoverLetter = a.CoverLetter,
        ExpectedSalary = a.ExpectedSalary,
        CurrentSalary = a.CurrentSalary,
        NoticePeriod = a.NoticePeriod,
        Status = a.Status,
        EmployerNotes = a.EmployerNotes,
        InterviewDate = a.InterviewDate,
        InterviewLocation = a.InterviewLocation,
        InterviewMode = a.InterviewMode,
        IsRead = a.IsRead,
        IsStarred = a.IsStarred,
        CreatedDate = a.CreatedDate,
    };
}
