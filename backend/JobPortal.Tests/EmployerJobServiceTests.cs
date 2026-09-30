using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Tests;

public class EmployerJobServiceTests
{
    private const int ProfileId = 1;
    private const string AdminId = "admin-1";

    private static async Task<(EmployerJobService Service, AppDbContext Db)> SeedAsync(string dbName, bool emailVerified)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser
        {
            Id = "employer-user-1", FirstName = "Ravi", LastName = "Shah", Email = "ravi@acme.example",
            EmailConfirmed = emailVerified, IsEmailVerified = emailVerified, CreatedDate = DateTime.UtcNow,
        });
        db.EmployerProfiles.Add(new EmployerProfile
        {
            Id = ProfileId, UserId = "employer-user-1", CompanyName = "Acme Corp", CompanySlug = "acme-corp",
            CompanySize = "11-50", City = "Ahmedabad", State = "Gujarat", ContactName = "Owner",
            ContactEmail = "owner@acme.example", ContactPhone = "9999999999", CreatedDate = DateTime.UtcNow,
            IsActive = true,
        });
        await db.SaveChangesAsync();
        var service = new EmployerJobService(db, new FakeBackgroundTaskQueue(), new ConfigurationBuilder().Build(), new NoOpAuditService());
        return (service, db);
    }

    private static UpsertEmployerJobRequest ValidRequest(string title = "Backend Engineer") => new()
    {
        Title = title,
        Description = "Build and maintain the platform APIs and background jobs.",
        Qualification = "B.E./B.Tech in CS or equivalent",
        City = "Ahmedabad",
        State = "Gujarat",
    };

    [Fact]
    public async Task CreateAsync_EmailNotVerified_IsBlocked()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), emailVerified: false);

        var result = await service.CreateAsync(ProfileId, ValidRequest());

        Assert.False(result.Succeeded);
        Assert.Equal("EmailNotVerified", result.ErrorCode);
        Assert.Equal(0, await db.EmployerJobs.CountAsync());
    }

    [Fact]
    public async Task CreateAsync_FirstPosting_GoesToPendingReview()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);

        var result = await service.CreateAsync(ProfileId, ValidRequest());

        Assert.True(result.Succeeded);
        var saved = await db.EmployerJobs.AsNoTracking().SingleAsync();
        Assert.Equal(EmployerJobStatuses.PendingReview, saved.Status);
        Assert.True(saved.IsActive);
        Assert.Null(saved.ApprovedAt);
        Assert.NotNull(saved.DuplicateFingerprint);
    }

    [Fact]
    public async Task PublicVisibility_HiddenWhilePending_ShownAfterApproval()
    {
        var (service, _) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);
        var created = await service.CreateAsync(ProfileId, ValidRequest());

        Assert.Null(await service.GetPublicBySlugAsync(created.Data!.Slug, null)); // PendingReview -> not viewable by URL
        Assert.Empty(await service.SearchPublicAsync(null, null, null));           // and not in listings

        await service.ApproveAsync(created.Data.Id, AdminId);

        var results = await service.SearchPublicAsync(null, null, null);
        Assert.Single(results);
        Assert.Equal(created.Data.Slug, results[0].Slug);
    }

    [Fact]
    public async Task CreateAsync_AfterFirstApproval_AutoPublishesLaterPostings()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);

        var first = await service.CreateAsync(ProfileId, ValidRequest("Backend Engineer"));
        await service.ApproveAsync(first.Data!.Id, AdminId);

        var second = await service.CreateAsync(ProfileId, ValidRequest("Frontend Engineer"));

        Assert.True(second.Succeeded);
        var saved = await db.EmployerJobs.AsNoTracking().SingleAsync(j => j.Title == "Frontend Engineer");
        Assert.Equal(EmployerJobStatuses.Active, saved.Status);
    }

    [Fact]
    public async Task ApproveAsync_SetsActiveAndStampsApprover()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);
        var created = await service.CreateAsync(ProfileId, ValidRequest());

        var result = await service.ApproveAsync(created.Data!.Id, AdminId);

        Assert.True(result.Succeeded);
        var saved = await db.EmployerJobs.AsNoTracking().SingleAsync();
        Assert.Equal(EmployerJobStatuses.Active, saved.Status);
        Assert.True(saved.IsActive);
        Assert.NotNull(saved.ApprovedAt);
        Assert.Equal(AdminId, saved.ApprovedByUserId);
    }

    [Fact]
    public async Task ApproveAsync_AlreadyActive_ReturnsNotPending()
    {
        var (service, _) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);
        var created = await service.CreateAsync(ProfileId, ValidRequest());
        await service.ApproveAsync(created.Data!.Id, AdminId);

        var again = await service.ApproveAsync(created.Data.Id, AdminId);

        Assert.False(again.Succeeded);
        Assert.Equal("NotPending", again.ErrorCode);
    }

    [Fact]
    public async Task RejectAsync_SetsRejectedInactiveWithReason()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);
        var created = await service.CreateAsync(ProfileId, ValidRequest());

        var result = await service.RejectAsync(created.Data!.Id, AdminId, "Company details could not be verified.");

        Assert.True(result.Succeeded);
        var saved = await db.EmployerJobs.AsNoTracking().SingleAsync();
        Assert.Equal(EmployerJobStatuses.Rejected, saved.Status);
        Assert.False(saved.IsActive);
        Assert.Equal("Company details could not be verified.", saved.RejectionReason);
    }

    [Fact]
    public async Task CreateAsync_DuplicateActiveFingerprint_IsBlocked()
    {
        var (service, _) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);

        var first = await service.CreateAsync(ProfileId, ValidRequest());
        Assert.True(first.Succeeded);

        // Same title + city, different casing / whitespace, while the first is still active.
        var second = await service.CreateAsync(ProfileId, new UpsertEmployerJobRequest
        {
            Title = "  backend   engineer ", Description = "A different description entirely here.",
            Qualification = "B.Tech", City = "ahmedabad", State = "Gujarat",
        });

        Assert.False(second.Succeeded);
        Assert.Equal("DuplicatePosting", second.ErrorCode);
    }

    [Fact]
    public async Task CreateAsync_SameTitleAfterFirstClosed_IsAllowed()
    {
        var (service, _) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);

        var first = await service.CreateAsync(ProfileId, ValidRequest());
        await service.CloseAsync(ProfileId, first.Data!.Id);

        var second = await service.CreateAsync(ProfileId, ValidRequest());

        Assert.True(second.Succeeded);
    }

    [Fact]
    public async Task GetPendingReviewAsync_ReturnsOnlyUntrustedEmployersPostings()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), emailVerified: true);

        // Employer 1 becomes trusted and auto-publishes a second posting.
        var a = await service.CreateAsync(ProfileId, ValidRequest("Job A"));
        await service.ApproveAsync(a.Data!.Id, AdminId);
        await service.CreateAsync(ProfileId, ValidRequest("Job B"));

        // Employer 2 is brand new — their first posting is held.
        db.AspNetUsers.Add(new AspNetUser
        {
            Id = "employer-user-2", FirstName = "Meera", LastName = "Rao", Email = "meera@beta.example",
            EmailConfirmed = true, IsEmailVerified = true, CreatedDate = DateTime.UtcNow,
        });
        db.EmployerProfiles.Add(new EmployerProfile
        {
            Id = 2, UserId = "employer-user-2", CompanyName = "Beta Ltd", CompanySlug = "beta-ltd",
            CompanySize = "1-10", City = "Surat", State = "Gujarat", ContactName = "Meera",
            ContactEmail = "meera@beta.example", ContactPhone = "8888888888", CreatedDate = DateTime.UtcNow, IsActive = true,
        });
        await db.SaveChangesAsync();
        await service.CreateAsync(2, ValidRequest("Junior Developer"));

        var pending = await service.GetPendingReviewAsync();

        Assert.Single(pending);
        Assert.Equal("Junior Developer", pending[0].Title);
        Assert.Equal("Beta Ltd", pending[0].CompanyName);
        Assert.Equal(0, pending[0].PriorApprovedPostings);
    }
}
