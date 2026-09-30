using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

public class TestServiceSoftDeleteTests
{
    private static async Task<(TestService Service, JobPortal.Infrastructure.Data.AppDbContext Db)> SeedAsync(string dbName, bool withAttempt)
    {
        var db = TestDb.Create(dbName);
        db.Exams.Add(new Exam { Id = 1, Name = "SSC CGL", Slug = "ssc-cgl", IsActive = true, CreatedDate = DateTime.UtcNow });
        db.Tests.Add(new Test
        {
            Id = 10, ExamId = 1, Title = "SSC CGL Mock 1", Slug = "ssc-cgl-mock-1",
            DurationMinutes = 60, MarksPerQuestion = 1, IsFree = true, IsActive = true, IsDeleted = false,
            Status = 1, CreatedDate = DateTime.UtcNow,
        });
        if (withAttempt)
        {
            db.AspNetUsers.Add(new AspNetUser { Id = "u1", FirstName = "A", LastName = "B", CreatedDate = DateTime.UtcNow });
            db.Attempts.Add(new Attempt { Id = 1, TestId = 10, UserId = "u1", StartedAt = DateTime.UtcNow, SubmittedAt = DateTime.UtcNow });
        }
        await db.SaveChangesAsync();
        return (new TestService(db), db);
    }

    [Fact]
    public async Task DeleteAsync_WithAttempts_SoftDeletesAndKeepsAttemptHistory()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), withAttempt: true);

        var result = await service.DeleteAsync(10);

        Assert.True(result.Succeeded);
        var test = await db.Tests.AsNoTracking().SingleAsync(t => t.Id == 10);
        Assert.True(test.IsDeleted);
        Assert.False(test.IsActive);
        Assert.True(await db.Attempts.AnyAsync(a => a.TestId == 10)); // history preserved
    }

    [Fact]
    public async Task DeleteAsync_HidesTestFromPublicSearchAndAdminList()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName(), withAttempt: false);

        await service.DeleteAsync(10);

        Assert.Empty(await service.SearchAsync(null, null, null, null));
        Assert.Empty(await service.GetAllForAdminAsync());
        Assert.Null(await service.GetBySlugAsync("ssc-cgl-mock-1", null));
    }

    [Fact]
    public async Task DeleteAsync_IsIdempotent()
    {
        var (service, _) = await SeedAsync(TestDb.NewDbName(), withAttempt: false);

        Assert.True((await service.DeleteAsync(10)).Succeeded);
        Assert.True((await service.DeleteAsync(10)).Succeeded);
    }

    [Fact]
    public async Task DeleteAsync_UnknownId_Fails()
    {
        var (service, _) = await SeedAsync(TestDb.NewDbName(), withAttempt: false);

        var result = await service.DeleteAsync(999);

        Assert.False(result.Succeeded);
        Assert.Equal("NotFound", result.ErrorCode);
    }
}
