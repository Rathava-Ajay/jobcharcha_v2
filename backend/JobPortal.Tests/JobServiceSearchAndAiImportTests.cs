using JobPortal.Application.DTOs.Jobs;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

public class JobServiceSearchAndAiImportTests
{
    private static async Task<(JobService Service, JobPortal.Infrastructure.Data.AppDbContext Db)> SeedAsync()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.Categories.Add(new Category { Id = 1, Name = "GSSSB", Slug = "gsssb", Icon = "x", CreatedDate = DateTime.UtcNow, IsActive = true });
        db.AspNetUsers.Add(new AspNetUser { Id = "admin-1", FirstName = "Admin", LastName = "User", CreatedDate = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var service = new JobService(db, new FakeBackgroundTaskQueue());

        var today = DateTime.UtcNow.Date;
        foreach (var (title, lastDateOffset, posts) in new[] { ("Clerk", 20, 100), ("Talati", 2, 900), ("Constable", -3, 5000), ("Teacher", 6, 50) })
        {
            var created = await service.CreateAsync(new UpsertJobRequest
            {
                Title = $"{title} Bharti 2026",
                OrganizationName = "GSSSB",
                CategoryId = 1,
                TotalPosts = posts,
                PostedDate = today.AddDays(-10),
                LastDate = today.AddDays(lastDateOffset),
                IsActive = true,
                Status = 1,
            }, "admin-1");
            Assert.True(created.Succeeded, created.Error);
        }
        return (service, db);
    }

    [Fact]
    public async Task SearchAsync_SortDeadline_OrdersOpenJobsBySoonestLastDate_AndPutsClosedLast()
    {
        var (service, _) = await SeedAsync();

        var result = await service.SearchAsync(new JobQuery { Sort = "deadline", PageSize = 10 });

        Assert.Equal(new[] { "Talati Bharti 2026", "Teacher Bharti 2026", "Clerk Bharti 2026", "Constable Bharti 2026" },
            result.Items.Select(i => i.Title).ToArray());
    }

    [Fact]
    public async Task SearchAsync_ClosingWithinDays_ReturnsOnlyOpenJobsInsideTheWindow()
    {
        var (service, _) = await SeedAsync();

        var result = await service.SearchAsync(new JobQuery { ClosingWithinDays = 7, PageSize = 10 });

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, i => Assert.Contains(i.Title, new[] { "Talati Bharti 2026", "Teacher Bharti 2026" }));
    }

    [Fact]
    public async Task SearchAsync_OpenOnly_HidesJobsWhoseLastDateHasPassed()
    {
        var (service, _) = await SeedAsync();

        var all = await service.SearchAsync(new JobQuery { PageSize = 10 });
        var open = await service.SearchAsync(new JobQuery { OpenOnly = true, PageSize = 10 });

        Assert.Equal(4, all.TotalCount);
        Assert.Equal(3, open.TotalCount);
        Assert.DoesNotContain(open.Items, i => i.Title.StartsWith("Constable"));
    }

    [Fact]
    public async Task SearchAsync_SortPosts_PutsLargestRecruitmentFirst()
    {
        var (service, _) = await SeedAsync();

        var result = await service.SearchAsync(new JobQuery { Sort = "posts", PageSize = 10 });

        Assert.Equal("Constable Bharti 2026", result.Items[0].Title);
    }

    [Fact]
    public async Task CreateFromAiImportAsync_MapsScalarFactsAndOtherDates()
    {
        var (service, db) = await SeedAsync();
        var lastDate = DateTime.UtcNow.Date.AddDays(15);

        var result = await service.CreateFromAiImportAsync(new AiImportJobRequest
        {
            Title = "Junior Clerk Bharti 2026",
            Department = "GSSSB",
            CategoryId = 1,
            FocusKeyword = "GSSSB Junior Clerk Bharti 2026",
            LastDate = lastDate,
            ShortDescription = "x",
            Overview = "<p>x</p>",
            HowToApply = "<ol><li>x</li></ol>",
            MetaTitle = "x",
            MetaDescription = "x",
            AdvertisementNumber = " 347/202526 ",
            OfficialWebsite = "https://gsssb.gujarat.gov.in",
            State = "Gujarat",
            MinAge = 18,
            MaxAge = 33,
            ExperienceRequired = 0,
            MinSalary = 26000,
            ApplicationFeeAmount = 500,
            ApplicationFeeDetails = "Pay online.",
            ImportantDates = new ImportantDatesRequest
            {
                ApplicationEnd = lastDate,
                OtherDates = { new OtherDateRequest { Label = "Written Exam", Date = "December 2026 (Tentative)" } },
            },
        }, "admin-1");

        Assert.True(result.Succeeded, result.Error);
        var job = await db.Jobs.AsNoTracking().SingleAsync(j => j.Title == "Junior Clerk Bharti 2026");
        Assert.Equal("347/202526", job.AdvertisementNumber);
        Assert.Equal("https://gsssb.gujarat.gov.in", job.OfficialWebsite);
        Assert.Equal("Gujarat", job.State);
        Assert.Equal(18, job.MinAge);
        Assert.Equal(33, job.MaxAge);
        Assert.Equal(0, job.ExperienceRequired);
        Assert.Equal(26000m, job.MinSalary);
        Assert.Null(job.MaxSalary);
        Assert.Equal(500m, job.ApplicationFee);

        var dates = result.Data!.ImportantDates;
        Assert.Contains(dates, d => d.Label == "Written Exam" && d.Date == "December 2026 (Tentative)");
        // Application End equals the last date, so only the "Last Date to Apply" row is shown.
        Assert.DoesNotContain(dates, d => d.Label == "Application End");
        Assert.Single(dates, d => d.Label == "Last Date to Apply");
    }
}
