using JobPortal.Application.Common;
using JobPortal.Application.DTOs.News;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPortal.Tests;

/// <summary>Auto-share step 2: publishing queues one share per enabled channel, once, and can be skipped.</summary>
public class SocialShareEnqueueTests
{
    private static SocialShareOptions AllConfigured() => new()
    {
        TelegramBotToken = "t", TelegramChannelId = "@c", MetaPageAccessToken = "m", MetaPageId = "p",
        InstagramAccountId = "i", PublicBaseUrl = "https://example.test",
    };

    private static (AppDbContext Db, NewsService News) Setup(SocialShareOptions? options = null)
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var social = new SocialShareService(db, options ?? AllConfigured(), NullLogger<SocialShareService>.Instance);
        return (db, new NewsService(db, social));
    }

    private static UpsertNewsRequest Article(bool active = true, bool skip = false) => new()
    {
        Title = "GSSSB announces exam calendar <b>2026</b>",
        Summary = "Calendar released.",
        Content = "<p>Calendar released.</p>",
        IsActive = active,
        SkipSocial = skip,
    };

    [Fact]
    public async Task Publishing_QueuesOneShare_PerEnabledChannel_AwaitingApprovalByDefault()
    {
        var (db, news) = Setup();
        var created = await news.CreateAsync(Article(), "admin-1");
        Assert.True(created.Succeeded);

        var jobs = await db.SocialShareJobs.ToListAsync();
        Assert.Equal(3, jobs.Count);
        Assert.All(jobs, j => Assert.Equal(0, j.Status)); // AwaitingApproval
        Assert.All(jobs, j => Assert.StartsWith("https://example.test/news/", j.Url));
        Assert.All(jobs, j => Assert.DoesNotContain("<b>", j.Title));
    }

    [Fact]
    public async Task SkipSocial_AndDrafts_QueueNothing()
    {
        var (db, news) = Setup();
        await news.CreateAsync(Article(skip: true), "admin-1");
        await news.CreateAsync(Article(active: false), "admin-1");
        Assert.Empty(await db.SocialShareJobs.ToListAsync());
    }

    [Fact]
    public async Task EditingOrRepublishing_NeverQueuesASecondShare()
    {
        var (db, news) = Setup();
        var id = (await news.CreateAsync(Article(), "admin-1")).Data!.Id;

        await news.UpdateAsync(id, Article(), "admin-1");                 // plain edit
        await news.UpdateAsync(id, Article(active: false), "admin-1");    // unpublish
        await news.UpdateAsync(id, Article(), "admin-1");                 // republish

        Assert.Equal(3, await db.SocialShareJobs.CountAsync());
    }

    [Fact]
    public async Task UnconfiguredChannel_IsRecordedAsSkipped_NotQueued()
    {
        var (db, news) = Setup(new SocialShareOptions { TelegramBotToken = "t", TelegramChannelId = "@c" });
        await news.CreateAsync(Article(), "admin-1");

        var jobs = await db.SocialShareJobs.ToListAsync();
        Assert.Equal(1, jobs.Count(j => j.Status == 0));
        Assert.Equal(2, jobs.Count(j => j.Status == 4));
        Assert.All(jobs.Where(j => j.Status == 4), j => Assert.Contains("isn't configured", j.Error));
    }

    [Fact]
    public async Task DisabledChannel_IsNotQueued_AndAutomaticModeQueuesPending()
    {
        var (db, news) = Setup();
        db.SocialShareSettings.Add(new SocialShareSetting
        {
            Category = "news", TelegramEnabled = true, InstagramEnabled = false, FacebookEnabled = false,
            RequireApproval = false, ImageSize = "square", UpdatedDate = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        await news.CreateAsync(Article(), "admin-1");
        var job = Assert.Single(await db.SocialShareJobs.ToListAsync());
        Assert.Equal("telegram", job.Channel);
        Assert.Equal(1, job.Status); // Pending
        Assert.NotNull(job.NextAttemptAt);
    }

    [Fact]
    public async Task ShareAgain_CreatesNextGeneration_ButNotWhileOneIsInFlight()
    {
        var (db, news) = Setup();
        var id = (await news.CreateAsync(Article(), "admin-1")).Data!.Id;
        var social = new SocialShareService(db, AllConfigured(), NullLogger<SocialShareService>.Instance);

        // First generation is still AwaitingApproval -> refuse to stack another.
        Assert.False((await social.ShareAgainAsync("news", id, "admin-1")).Succeeded);

        foreach (var j in db.SocialShareJobs) j.Status = 2; // posted
        await db.SaveChangesAsync();

        var again = await social.ShareAgainAsync("news", id, "admin-1");
        Assert.True(again.Succeeded);
        Assert.Equal(3, again.Data);
        Assert.Equal(6, await db.SocialShareJobs.CountAsync());
        Assert.Equal(3, await db.SocialShareJobs.CountAsync(j => j.Generation == 1 && j.Status == 1 && j.Trigger == "manual"));
    }
}
