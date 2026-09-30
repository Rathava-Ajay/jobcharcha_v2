using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Tests;

public class JobApplicationServiceTests
{
    private static async Task<(JobApplicationService Service, JobPortal.Infrastructure.Data.AppDbContext Db, EmployerJob Job, FakeBackgroundTaskQueue Queue)>
        SeedJobAsync(string dbName, bool applicantHasResume = true)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser
        {
            Id = "applicant-1", FirstName = "Asha", LastName = "Patel", Email = "asha@example.com",
            Resume = applicantHasResume ? "https://files.example/asha-resume.pdf" : null,
            CreatedDate = DateTime.UtcNow,
        });
        db.EmployerProfiles.Add(new EmployerProfile
        {
            Id = 1, UserId = "employer-user-1", CompanyName = "Acme Corp", CompanySlug = "acme-corp",
            CompanySize = "11-50", City = "Ahmedabad", State = "Gujarat", ContactName = "Owner",
            ContactEmail = "owner@acme.example", ContactPhone = "9999999999", CreatedDate = DateTime.UtcNow, IsActive = true,
        });
        var job = new EmployerJob
        {
            Id = 1, EmployerProfileId = 1, Title = "Backend Engineer", Slug = "backend-engineer-1",
            JobType = "full-time", WorkMode = "onsite", Description = "Build things.", Qualification = "B.Tech",
            City = "Ahmedabad", State = "Gujarat", Status = "active", CreatedDate = DateTime.UtcNow, IsActive = true,
        };
        db.EmployerJobs.Add(job);
        await db.SaveChangesAsync();

        var queue = new FakeBackgroundTaskQueue();
        var service = new JobApplicationService(db, queue, new ConfigurationBuilder().Build(), new NoOpAuditService());
        return (service, db, job, queue);
    }

    [Fact]
    public async Task ApplyAsync_NewApplication_SetsStatusApplied()
    {
        var (service, db, job, _) = await SeedJobAsync(TestDb.NewDbName());

        var result = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest { CoverLetter = "Hi" });

        Assert.True(result.Succeeded);
        Assert.Equal(ApplicationStatuses.Applied, result.Data!.Status);
        var reloaded = await db.JobApplications.AsNoTracking().SingleAsync();
        Assert.Equal(ApplicationStatuses.Applied, reloaded.Status);
        Assert.False(reloaded.IsRead);
    }

    [Fact]
    public async Task ApplyAsync_AlreadyApplied_ReturnsAlreadyApplied()
    {
        var (service, _, job, _) = await SeedJobAsync(TestDb.NewDbName());
        await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        var result = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        Assert.False(result.Succeeded);
        Assert.Equal("AlreadyApplied", result.ErrorCode);
    }

    [Fact]
    public async Task GetForEmployerJobAsync_FirstView_AdvancesAppliedToUnderReview()
    {
        var (service, db, job, _) = await SeedJobAsync(TestDb.NewDbName());
        await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        var result = await service.GetForEmployerJobAsync(job.EmployerProfileId, job.Id);

        Assert.True(result.Succeeded);
        Assert.Equal(ApplicationStatuses.UnderReview, result.Data![0].Status);
        Assert.True(result.Data[0].IsRead);

        var reloaded = await db.JobApplications.AsNoTracking().SingleAsync();
        Assert.Equal(ApplicationStatuses.UnderReview, reloaded.Status);
        Assert.True(reloaded.IsRead);
    }

    [Fact]
    public async Task GetForEmployerJobAsync_AlreadyShortlisted_DoesNotDowngradeToUnderReview()
    {
        var (service, db, job, _) = await SeedJobAsync(TestDb.NewDbName());
        var applied = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());
        await service.UpdateStatusAsync(job.EmployerProfileId, applied.Data!.Id, new UpdateApplicationStatusRequest { Status = ApplicationStatuses.Shortlisted });

        // Re-fetching the list (e.g. employer reopens the page) must not knock a Shortlisted
        // application back down to Viewed just because IsRead happened to already be true.
        var result = await service.GetForEmployerJobAsync(job.EmployerProfileId, job.Id);

        Assert.Equal(ApplicationStatuses.Shortlisted, result.Data![0].Status);
        var reloaded = await db.JobApplications.AsNoTracking().SingleAsync();
        Assert.Equal(ApplicationStatuses.Shortlisted, reloaded.Status);
    }

    [Fact]
    public async Task GetForEmployerJobAsync_SecondView_DoesNotResetUnderReviewBack_NoOpIsFine()
    {
        var (service, _, job, _) = await SeedJobAsync(TestDb.NewDbName());
        await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());
        await service.GetForEmployerJobAsync(job.EmployerProfileId, job.Id); // first view: Applied -> UnderReview

        var result = await service.GetForEmployerJobAsync(job.EmployerProfileId, job.Id); // second view

        Assert.Equal(ApplicationStatuses.UnderReview, result.Data![0].Status);
    }

    [Theory]
    [InlineData(ApplicationStatuses.Shortlisted)]
    [InlineData(ApplicationStatuses.Interview)]
    [InlineData(ApplicationStatuses.Rejected)]
    [InlineData(ApplicationStatuses.Selected)]
    public async Task UpdateStatusAsync_EmployerSettableStatus_Succeeds(string status)
    {
        var (service, _, job, _) = await SeedJobAsync(TestDb.NewDbName());
        var applied = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        var result = await service.UpdateStatusAsync(job.EmployerProfileId, applied.Data!.Id, new UpdateApplicationStatusRequest { Status = status });

        Assert.True(result.Succeeded);
        Assert.Equal(status, result.Data!.Status);
    }

    [Theory]
    [InlineData(ApplicationStatuses.Applied)]
    [InlineData(ApplicationStatuses.UnderReview)]
    [InlineData("not-a-real-status")]
    public async Task UpdateStatusAsync_NonEmployerSettableStatus_Rejected(string status)
    {
        var (service, _, job, _) = await SeedJobAsync(TestDb.NewDbName());
        var applied = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        var result = await service.UpdateStatusAsync(job.EmployerProfileId, applied.Data!.Id, new UpdateApplicationStatusRequest { Status = status });

        Assert.False(result.Succeeded);
        Assert.Equal("InvalidStatus", result.ErrorCode);
    }

    [Fact]
    public async Task UpdateStatusAsync_WrongEmployer_ReturnsNotFound()
    {
        var (service, _, job, _) = await SeedJobAsync(TestDb.NewDbName());
        var applied = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        var result = await service.UpdateStatusAsync(employerProfileId: 999, applied.Data!.Id, new UpdateApplicationStatusRequest { Status = ApplicationStatuses.Selected });

        Assert.False(result.Succeeded);
        Assert.Equal("NotFound", result.ErrorCode);
    }

    [Fact]
    public async Task ApplyAsync_ApplicantHasNoResume_IsBlocked()
    {
        var (service, db, job, queue) = await SeedJobAsync(TestDb.NewDbName(), applicantHasResume: false);

        var result = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        Assert.False(result.Succeeded);
        Assert.Equal("ResumeRequired", result.ErrorCode);
        Assert.Equal(0, await db.JobApplications.CountAsync());
        Assert.Equal(0, queue.QueuedCount);
    }

    [Fact]
    public async Task ApplyAsync_Success_QueuesEmployerNotification()
    {
        var (service, _, job, queue) = await SeedJobAsync(TestDb.NewDbName());

        var result = await service.ApplyAsync("applicant-1", job.Id, new ApplyToJobRequest());

        Assert.True(result.Succeeded);
        Assert.Equal(1, queue.QueuedCount);
    }
}
