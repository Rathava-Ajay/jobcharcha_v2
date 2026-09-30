using System.Text.RegularExpressions;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JobPortal.Infrastructure.Services;

public class EmployerJobService : IEmployerJobService
{
    // Employers with no active paid plan can still post up to this many active jobs for free.
    private const int FreeTierMaxActiveJobs = 5;

    private readonly AppDbContext _db;
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IConfiguration _config;
    private readonly IAuditService _audit;

    public EmployerJobService(AppDbContext db, IBackgroundTaskQueue taskQueue, IConfiguration config, IAuditService audit)
    {
        _db = db;
        _taskQueue = taskQueue;
        _config = config;
        _audit = audit;
    }

    public async Task<List<EmployerJobListItemDto>> GetMineAsync(int employerProfileId)
    {
        var jobs = await _db.EmployerJobs.AsNoTracking()
            .Where(j => j.EmployerProfileId == employerProfileId)
            .OrderByDescending(j => j.CreatedDate)
            .ToListAsync();
        return jobs.Select(ToListItemDto).ToList();
    }

    public async Task<EmployerJobDto?> GetByIdForEmployerAsync(int employerProfileId, int id)
    {
        var job = await _db.EmployerJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == id && j.EmployerProfileId == employerProfileId);
        return job is null ? null : ToDto(job);
    }

    public async Task<ServiceResult<EmployerJobDto>> CreateAsync(int employerProfileId, UpsertEmployerJobRequest request)
    {
        // Field-shape validation (Required / length) is enforced by data annotations on
        // UpsertEmployerJobRequest before the request reaches here (400 with field errors).

        var profile = await _db.EmployerProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == employerProfileId);
        if (profile is null)
            return ServiceResult<EmployerJobDto>.Fail("NoEmployerProfile", "No employer profile found for this account.");

        // Gate 1 — the posting employer's email must be verified. Controller maps this to HTTP 403.
        if (!profile.User.IsEmailVerified)
            return ServiceResult<EmployerJobDto>.Fail("EmailNotVerified",
                "Verify your email address before posting a job. Enter the confirmation code from your inbox on your dashboard, or request a new one.");

        // Gate 2 — duplicate-posting guard. Normalized title|company|city fingerprint (mirrors
        // JobService.BuildFingerprint). Checked only against the employer's own still-active
        // postings, so closing one frees the fingerprint up again. Controller maps this to HTTP 409.
        var fingerprint = BuildFingerprint(request.Title, profile.CompanyName, request.City);
        var duplicateExists = await _db.EmployerJobs.AnyAsync(j =>
            j.EmployerProfileId == employerProfileId && j.IsActive && j.DuplicateFingerprint == fingerprint);
        if (duplicateExists)
            return ServiceResult<EmployerJobDto>.Fail("DuplicatePosting",
                "You already have an active posting that looks like this (same title and city). Edit or close the existing one instead.");

        // Plan / free-tier cap — count postings occupying a live slot (Active + still under review).
        var sub = await GetActiveSubscriptionAsync(employerProfileId);
        var maxActiveJobs = sub?.MaxActiveJobs ?? FreeTierMaxActiveJobs;
        var occupyingCount = await _db.EmployerJobs.CountAsync(j =>
            j.EmployerProfileId == employerProfileId && j.IsActive &&
            (j.Status == EmployerJobStatuses.Active || j.Status == EmployerJobStatuses.PendingReview));
        if (occupyingCount >= maxActiveJobs)
        {
            var limitMessage = sub is null
                ? $"You've used all {FreeTierMaxActiveJobs} free job postings. Upgrade to a paid plan to post more."
                : $"Your plan allows up to {sub.MaxActiveJobs} active job posting(s). Close an existing posting or upgrade your plan.";
            return ServiceResult<EmployerJobDto>.Fail("JobLimitReached", limitMessage);
        }

        // Moderation ramp — an employer's first posting (none of theirs has ever been admin-approved)
        // is held for review; once they have >= 1 admin-approved posting their later posts publish
        // immediately.
        var isTrusted = await _db.EmployerJobs.AnyAsync(j =>
            j.EmployerProfileId == employerProfileId && j.ApprovedAt != null);
        var status = isTrusted ? EmployerJobStatuses.Active : EmployerJobStatuses.PendingReview;

        var baseSlug = string.IsNullOrWhiteSpace(request.Slug)
            ? Slugify($"{request.Title}-{request.City}")
            : Slugify(request.Slug);

        // check-then-insert on the slug can race a concurrent post; on a unique-index violation,
        // retry with a randomized suffix instead of surfacing a raw 500.
        const int maxAttempts = 5;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var slug = attempt == 1
                ? await EnsureUniqueSlugAsync(baseSlug, null)
                : $"{baseSlug}-{Guid.NewGuid():N}"[..Math.Min(baseSlug.Length + 7, 320)];

            var entity = new EmployerJob
            {
                EmployerProfileId = employerProfileId,
                Title = request.Title,
                Slug = slug,
                Department = request.Department,
                JobType = request.JobType,
                WorkMode = request.WorkMode,
                Description = request.Description,
                Requirements = request.Requirements,
                Benefits = request.Benefits,
                Skills = request.Skills,
                Qualification = request.Qualification,
                ExperienceRequired = request.ExperienceRequired,
                SalaryMin = request.SalaryMin,
                SalaryMax = request.SalaryMax,
                IsSalaryNegotiable = request.IsSalaryNegotiable,
                HideSalary = request.HideSalary,
                City = request.City,
                State = request.State,
                Openings = request.Openings,
                IsUrgent = request.IsUrgent,
                LastDate = request.LastDate,
                AttachmentUrl = request.AttachmentUrl,
                AttachmentName = request.AttachmentName,
                IsFeatured = false,
                ViewCount = 0,
                ApplicationCount = 0,
                Status = status,
                IsActive = true,
                DuplicateFingerprint = fingerprint,
                CreatedDate = DateTime.UtcNow,
            };
            _db.EmployerJobs.Add(entity);
            if (sub is not null) sub.JobsPostedThisCycle += 1;
            profile.TotalJobsPosted += 1;

            try
            {
                await _db.SaveChangesAsync();
                await _audit.LogAsync(new AuditEntry
                {
                    EventType = AuditEventTypes.EmployerJobCreated,
                    Category = AuditEventTypes.Categories.Employer,
                    Summary = $"Employer job posted: \"{entity.Title}\" by {profile.CompanyName}"
                        + (status == EmployerJobStatuses.PendingReview ? " (pending review)" : ""),
                    ActorUserId = profile.UserId,
                    ActorEmail = profile.User?.Email,
                    ActorRole = "employer",
                    TargetType = "EmployerJob",
                    TargetId = entity.Id.ToString(),
                    Metadata = new { title = entity.Title, employerProfileId, status = entity.Status, city = entity.City },
                });
                return ServiceResult<EmployerJobDto>.Ok(ToDto(entity));
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex, "IX_EmployerJobs_Slug") && attempt < maxAttempts)
            {
                _db.ChangeTracker.Clear();
                profile = await _db.EmployerProfiles.Include(p => p.User).FirstAsync(p => p.Id == employerProfileId);
                sub = await GetActiveSubscriptionAsync(employerProfileId);
            }
        }

        return ServiceResult<EmployerJobDto>.Fail("SlugConflict", "Could not generate a unique link for this posting. Please try again.");
    }

    public async Task<List<AdminPendingEmployerJobDto>> GetPendingReviewAsync()
    {
        var jobs = await _db.EmployerJobs.AsNoTracking()
            .Include(j => j.EmployerProfile).ThenInclude(p => p.User)
            .Where(j => j.Status == EmployerJobStatuses.PendingReview)
            .OrderBy(j => j.CreatedDate)
            .ToListAsync();

        var profileIds = jobs.Select(j => j.EmployerProfileId).Distinct().ToList();
        var approvedByProfile = (await _db.EmployerJobs.AsNoTracking()
                .Where(j => profileIds.Contains(j.EmployerProfileId) && j.ApprovedAt != null)
                .GroupBy(j => j.EmployerProfileId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync())
            .ToDictionary(x => x.Key, x => x.Count);

        return jobs.Select(j => new AdminPendingEmployerJobDto
        {
            Id = j.Id,
            Title = j.Title,
            Slug = j.Slug,
            Status = j.Status,
            EmployerProfileId = j.EmployerProfileId,
            CompanyName = j.EmployerProfile.CompanyName,
            EmployerEmail = j.EmployerProfile.User.Email,
            EmployerEmailVerified = j.EmployerProfile.User.IsEmailVerified,
            City = j.City,
            State = j.State,
            JobType = j.JobType,
            WorkMode = j.WorkMode,
            Department = j.Department,
            Description = j.Description,
            Requirements = j.Requirements,
            Benefits = j.Benefits,
            Skills = j.Skills,
            Qualification = j.Qualification,
            ExperienceRequired = j.ExperienceRequired,
            SalaryMin = j.SalaryMin,
            SalaryMax = j.SalaryMax,
            Openings = j.Openings,
            IsUrgent = j.IsUrgent,
            LastDate = j.LastDate,
            AttachmentUrl = j.AttachmentUrl,
            AttachmentName = j.AttachmentName,
            CreatedDate = j.CreatedDate,
            PriorApprovedPostings = approvedByProfile.TryGetValue(j.EmployerProfileId, out var c) ? c : 0,
        }).ToList();
    }

    public async Task<ServiceResult> ApproveAsync(int employerJobId, string adminUserId)
    {
        var job = await _db.EmployerJobs.Include(j => j.EmployerProfile).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(j => j.Id == employerJobId);
        if (job is null) return ServiceResult.Fail("NotFound", "Job posting not found.");
        if (job.Status != EmployerJobStatuses.PendingReview)
            return ServiceResult.Fail("NotPending", $"This posting is already {job.Status}.");

        job.Status = EmployerJobStatuses.Active;
        job.IsActive = true;
        job.ApprovedAt = DateTime.UtcNow;
        job.ApprovedByUserId = adminUserId;
        job.RejectionReason = null;
        job.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        EnqueueModerationEmail(job.EmployerProfile.User.Email, job.Title,
            subject: "Your JobCharcha posting is now live",
            body: $"Good news — your posting \"{job.Title}\" has been approved and is now live at {FrontendUrl()}/private-jobs/{job.Slug}.\n\n" +
                  "Your account is now verified, so any job you post from here on publishes immediately.");
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> RejectAsync(int employerJobId, string adminUserId, string reason)
    {
        var job = await _db.EmployerJobs.Include(j => j.EmployerProfile).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(j => j.Id == employerJobId);
        if (job is null) return ServiceResult.Fail("NotFound", "Job posting not found.");
        if (job.Status != EmployerJobStatuses.PendingReview)
            return ServiceResult.Fail("NotPending", $"This posting is already {job.Status}.");

        job.Status = EmployerJobStatuses.Rejected;
        job.IsActive = false;
        job.RejectionReason = reason;
        job.ApprovedByUserId = adminUserId;
        job.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        EnqueueModerationEmail(job.EmployerProfile.User.Email, job.Title,
            subject: "Update on your JobCharcha posting",
            body: $"Your posting \"{job.Title}\" was not approved for publication.\n\nReason: {reason}\n\n" +
                  "You're welcome to submit a new posting that addresses this.");
        return ServiceResult.Ok();
    }

    private string FrontendUrl() => (_config["App:FrontendBaseUrl"] ?? "http://localhost:3000").TrimEnd('/');

    private void EnqueueModerationEmail(string? toEmail, string jobTitle, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return;
        _taskQueue.QueueBackgroundWorkItem(async (sp, ct) =>
        {
            var sender = sp.GetRequiredService<IEmailSender>();
            await sender.SendAsync(toEmail, subject, body);
        });
    }

    public async Task<ServiceResult<EmployerJobDto>> UpdateAsync(int employerProfileId, int id, UpsertEmployerJobRequest request)
    {
        var entity = await _db.EmployerJobs.FirstOrDefaultAsync(j => j.Id == id && j.EmployerProfileId == employerProfileId);
        if (entity is null) return ServiceResult<EmployerJobDto>.Fail("NotFound", "Job posting not found.");

        entity.Title = request.Title;
        entity.Department = request.Department;
        entity.JobType = request.JobType;
        entity.WorkMode = request.WorkMode;
        entity.Description = request.Description;
        entity.Requirements = request.Requirements;
        entity.Benefits = request.Benefits;
        entity.Skills = request.Skills;
        entity.Qualification = request.Qualification;
        entity.ExperienceRequired = request.ExperienceRequired;
        entity.SalaryMin = request.SalaryMin;
        entity.SalaryMax = request.SalaryMax;
        entity.IsSalaryNegotiable = request.IsSalaryNegotiable;
        entity.HideSalary = request.HideSalary;
        entity.City = request.City;
        entity.State = request.State;
        entity.Openings = request.Openings;
        entity.IsUrgent = request.IsUrgent;
        entity.LastDate = request.LastDate;
        entity.AttachmentUrl = request.AttachmentUrl;
        entity.AttachmentName = request.AttachmentName;
        entity.UpdatedDate = DateTime.UtcNow;

        // Keep the duplicate fingerprint in step with an edited title/city.
        var companyName = await _db.EmployerProfiles
            .Where(p => p.Id == employerProfileId).Select(p => p.CompanyName).FirstAsync();
        entity.DuplicateFingerprint = BuildFingerprint(request.Title, companyName, request.City);

        await _db.SaveChangesAsync();
        return ServiceResult<EmployerJobDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult> CloseAsync(int employerProfileId, int id)
    {
        var entity = await _db.EmployerJobs.FirstOrDefaultAsync(j => j.Id == id && j.EmployerProfileId == employerProfileId);
        if (entity is null) return ServiceResult.Fail("NotFound", "Job posting not found.");

        entity.IsActive = false;
        entity.Status = EmployerJobStatuses.Closed;
        entity.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<List<PublicEmployerJobListItemDto>> SearchPublicAsync(string? search, string? city, string? jobType)
    {
        // PendingReview / Rejected / Closed are all excluded here by the Status == Active clause.
        var query = _db.EmployerJobs.AsNoTracking().Include(j => j.EmployerProfile)
            .Where(j => j.IsActive && j.Status == EmployerJobStatuses.Active).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(j => EF.Functions.Like(j.Title, $"%{s}%") || EF.Functions.Like(j.EmployerProfile.CompanyName, $"%{s}%"));
        }
        if (!string.IsNullOrWhiteSpace(city) && city != "All India / Central")
            query = query.Where(j => j.City.Contains(city) || j.State.Contains(city));
        if (!string.IsNullOrWhiteSpace(jobType))
            query = query.Where(j => j.JobType == jobType);

        var jobs = await query.OrderByDescending(j => j.IsFeatured).ThenByDescending(j => j.CreatedDate).ToListAsync();
        return jobs.Select(ToPublicListItemDto).ToList();
    }

    public async Task<PublicEmployerJobDetailDto?> GetPublicBySlugAsync(string slug, string? viewerUserId)
    {
        // Only genuinely-published postings are reachable by URL — a PendingReview posting
        // (IsActive == true but Status == PendingReview) must not be publicly viewable.
        var job = await _db.EmployerJobs.AsNoTracking().Include(j => j.EmployerProfile)
            .FirstOrDefaultAsync(j => j.Slug == slug && j.IsActive && j.Status == EmployerJobStatuses.Active);
        if (job is null) return null;

        await _db.EmployerJobs.Where(j => j.Id == job.Id).ExecuteUpdateAsync(s => s.SetProperty(j => j.ViewCount, j => j.ViewCount + 1));

        var hasApplied = viewerUserId is not null &&
            await _db.JobApplications.AnyAsync(a => a.EmployerJobId == job.Id && a.ApplicantUserId == viewerUserId);

        var dto = ToPublicDetailDto(job);
        dto.HasApplied = hasApplied;
        return dto;
    }

    private async Task<EmployerSubscription?> GetActiveSubscriptionAsync(int employerProfileId)
    {
        var today = DateTime.UtcNow.Date;
        return await _db.EmployerSubscriptions
            .Where(s => s.EmployerProfileId == employerProfileId && s.EndDate.Date >= today)
            .OrderByDescending(s => s.EndDate)
            .FirstOrDefaultAsync();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.EmployerJobs.AnyAsync(j => j.Slug == slug && j.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    /// <summary>Normalized "title|company|city" — mirrors JobService.BuildFingerprint for govt jobs.</summary>
    private static string BuildFingerprint(string title, string company, string city)
    {
        static string Normalize(string? s) =>
            Regex.Replace((s ?? string.Empty).Trim().ToLowerInvariant(), @"\s+", " ");
        return $"{Normalize(title)}|{Normalize(company)}|{Normalize(city)}";
    }

    /// <summary>SQL Server error 2601/2627 = unique index/constraint violation; optionally require the
    /// violated index name so an unrelated unique clash isn't mistaken for the slug race.</summary>
    private static bool IsUniqueViolation(DbUpdateException ex, string? indexNameHint = null)
    {
        if (ex.InnerException is not SqlException sql) return false;
        if (sql.Number != 2601 && sql.Number != 2627) return false;
        return indexNameHint is null || sql.Message.Contains(indexNameHint, StringComparison.OrdinalIgnoreCase);
    }

    private static EmployerJobListItemDto ToListItemDto(EmployerJob j) => new()
    {
        Id = j.Id,
        Title = j.Title,
        Slug = j.Slug,
        Department = j.Department,
        JobType = j.JobType,
        City = j.City,
        State = j.State,
        Openings = j.Openings,
        LastDate = j.LastDate,
        IsFeatured = j.IsFeatured,
        Status = j.Status,
        IsActive = j.IsActive,
        ViewCount = j.ViewCount,
        ApplicationCount = j.ApplicationCount,
        CreatedDate = j.CreatedDate,
    };

    private static EmployerJobDto ToDto(EmployerJob j) => new()
    {
        Id = j.Id,
        Title = j.Title,
        Slug = j.Slug,
        Department = j.Department,
        JobType = j.JobType,
        City = j.City,
        State = j.State,
        Openings = j.Openings,
        LastDate = j.LastDate,
        IsFeatured = j.IsFeatured,
        Status = j.Status,
        IsActive = j.IsActive,
        ViewCount = j.ViewCount,
        ApplicationCount = j.ApplicationCount,
        CreatedDate = j.CreatedDate,
        WorkMode = j.WorkMode,
        Description = j.Description,
        Requirements = j.Requirements,
        Benefits = j.Benefits,
        Skills = j.Skills,
        Qualification = j.Qualification,
        ExperienceRequired = j.ExperienceRequired,
        SalaryMin = j.SalaryMin,
        SalaryMax = j.SalaryMax,
        IsSalaryNegotiable = j.IsSalaryNegotiable,
        HideSalary = j.HideSalary,
        IsUrgent = j.IsUrgent,
        AttachmentUrl = j.AttachmentUrl,
        AttachmentName = j.AttachmentName,
    };

    private static PublicEmployerJobListItemDto ToPublicListItemDto(EmployerJob j) => new()
    {
        Id = j.Id,
        Title = j.Title,
        Slug = j.Slug,
        CompanyName = j.EmployerProfile.CompanyName,
        CompanyLogo = j.EmployerProfile.LogoUrl,
        IsCompanyVerified = j.EmployerProfile.IsVerified,
        JobType = j.JobType,
        WorkMode = j.WorkMode,
        City = j.City,
        State = j.State,
        SalaryMin = j.HideSalary ? null : j.SalaryMin,
        SalaryMax = j.HideSalary ? null : j.SalaryMax,
        HideSalary = j.HideSalary,
        IsFeatured = j.IsFeatured,
        IsUrgent = j.IsUrgent,
        LastDate = j.LastDate,
        CreatedDate = j.CreatedDate,
    };

    private static PublicEmployerJobDetailDto ToPublicDetailDto(EmployerJob j) => new()
    {
        Id = j.Id,
        Title = j.Title,
        Slug = j.Slug,
        CompanyName = j.EmployerProfile.CompanyName,
        CompanyLogo = j.EmployerProfile.LogoUrl,
        IsCompanyVerified = j.EmployerProfile.IsVerified,
        JobType = j.JobType,
        WorkMode = j.WorkMode,
        City = j.City,
        State = j.State,
        SalaryMin = j.HideSalary ? null : j.SalaryMin,
        SalaryMax = j.HideSalary ? null : j.SalaryMax,
        HideSalary = j.HideSalary,
        IsFeatured = j.IsFeatured,
        IsUrgent = j.IsUrgent,
        LastDate = j.LastDate,
        CreatedDate = j.CreatedDate,
        Department = j.Department,
        Description = j.Description,
        Requirements = j.Requirements,
        Benefits = j.Benefits,
        Skills = j.Skills,
        Qualification = j.Qualification,
        ExperienceRequired = j.ExperienceRequired,
        IsSalaryNegotiable = j.IsSalaryNegotiable,
        Openings = j.Openings,
        AttachmentUrl = j.AttachmentUrl,
        AttachmentName = j.AttachmentName,
    };
}
