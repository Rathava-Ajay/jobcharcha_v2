using JobPortal.Application.DTOs.Jobs;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;

namespace JobPortal.Tests;

public class HomepageDataFixTests
{
    [Fact]
    public async Task Categories_PublicCountMatchesOpenOnlyJobsList_AndExcludesExpired()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.Categories.Add(new Category { Id = 1, Name = "GPSC", Slug = "gpsc", Icon = "x", CreatedDate = DateTime.UtcNow, IsActive = true, ShowOnHomepage = true });
        db.AspNetUsers.Add(new AspNetUser { Id = "a", FirstName = "A", LastName = "B", CreatedDate = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var jobs = new JobService(db, new FakeBackgroundTaskQueue());
        var today = DateTime.UtcNow.Date;
        foreach (var (title, offset) in new[] { ("Open one", 5), ("Open two", 9), ("Expired", -20) })
            Assert.True((await jobs.CreateAsync(new UpsertJobRequest { Title = title, OrganizationName = "GPSC", CategoryId = 1, PostedDate = today.AddDays(-30), LastDate = today.AddDays(offset), IsActive = true, Status = 1 }, "a")).Succeeded);

        var categories = new CategoryService(db);
        var featured = (await categories.GetFeaturedAsync()).Single(c => c.Name == "GPSC");
        var openTotal = (await jobs.SearchAsync(new JobQuery { OpenOnly = true, PageSize = 10 })).TotalCount;

        Assert.Equal(2, featured.JobCount);
        Assert.Equal(openTotal, featured.JobCount);
        Assert.Equal(2, (await categories.GetAllAsync()).Single(c => c.Name == "GPSC").JobCount);
        Assert.Equal(3, (await categories.GetAllAsync(includeInactive: true)).Single(c => c.Name == "GPSC").JobCount); // admin view keeps the raw count
    }

    [Theory]
    [InlineData("10th", "Matriculation (10th Standard) or equivalent", true)]
    [InlineData("10th", "Graduate", false)]
    [InlineData("12th", "Class 12 pass", true)]
    [InlineData("Graduat", "Bachelor's Degree in any stream", true)]
    [InlineData("Graduat", "10th pass", false)]
    [InlineData("Post Grad", "Master's degree with 55% marks", true)]
    [InlineData("Post Grad", "MBA / MCA", true)]
    [InlineData("Post Grad", "12th pass", false)]
    [InlineData("ITI", "ITI in Fitter trade", true)]
    [InlineData("Diploma", "Diploma in Engineering", true)]
    public void QualificationMatches_CoversCommonSpellings(string filter, string qualification, bool expected)
    {
        var predicate = JobService.QualificationMatches(filter).Compile();
        Assert.Equal(expected, predicate(new Job { QualificationRequired = qualification }));
        Assert.False(predicate(new Job { QualificationRequired = null }));
    }

    [Fact]
    public async Task News_BreakingBadgeExpiresAfterSevenDays_AndOldBreakingDoesNotPinToTop()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var today = DateTime.UtcNow.Date;
        News Make(int id, string title, int ageDays, bool breaking) => new()
        {
            Id = id, Title = title, Slug = $"n{id}", Summary = "s", Content = "c", PublishedDate = today.AddDays(-ageDays),
            IsBreaking = breaking, IsActive = true, CreatedById = "a", CreatedDate = DateTime.UtcNow,
        };
        db.News.AddRange(Make(1, "Stale breaking", 60, true), Make(2, "Fresh plain", 1, false), Make(3, "Fresh breaking", 3, true));
        await db.SaveChangesAsync();

        var list = await new NewsService(db).GetAllAsync();

        Assert.Equal(new[] { "Fresh breaking", "Fresh plain", "Stale breaking" }, list.Select(n => n.Title).ToArray());
        Assert.Equal(new[] { true, false, false }, list.Select(n => n.IsBreaking).ToArray());
    }
}
