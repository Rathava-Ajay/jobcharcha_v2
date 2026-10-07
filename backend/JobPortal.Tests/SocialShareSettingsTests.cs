using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPortal.Tests;

/// <summary>Auto-share step 7 (backend half): per-category settings and the Activity Log queries.</summary>
public class SocialShareSettingsTests
{
    private static (SocialShareService Service, JobPortal.Infrastructure.Data.AppDbContext Db) Create()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        return (new SocialShareService(db, new SocialShareOptions { PublicBaseUrl = "https://x.test" }, NullLogger<SocialShareService>.Instance), db);
    }

    private static UpdateSocialShareSettingRequest Valid() => new()
    {
        TelegramEnabled = true, InstagramEnabled = false, FacebookEnabled = true, RequireApproval = false,
        TelegramTemplate = "<b>{title}</b>\n{last_date}", CaptionTemplate = "{title} {url}", Hashtags = "#a #b",
        ImageStyle = "saffron waves", ImageSize = "portrait", BrandColor = "#112233", AccentColor = "#FFAA00", LogoUrl = "/uploads/logo.png",
    };

    [Fact]
    public async Task GetSettings_ReturnsAllFiveCategories_WithDefaultsAndEditorHelp()
    {
        var (service, _) = Create();
        var all = await service.GetSettingsAsync();

        Assert.Equal(new[] { "job", "result", "admitcard", "scheme", "news" }, all.Select(s => s.Category));
        var job = all[0];
        Assert.True(job.RequireApproval);                       // approval-first default
        Assert.True(job.TelegramEnabled && job.InstagramEnabled && job.FacebookEnabled);
        Assert.Null(job.UpdatedDate);
        Assert.Contains("{last_date}", job.DefaultTelegramTemplate);
        Assert.Contains("last_date", job.Placeholders);
        Assert.StartsWith("#", job.DefaultHashtags);
    }

    [Fact]
    public async Task UpdateSettings_SavesAndIsReturnedByGet()
    {
        var (service, db) = Create();
        var result = await service.UpdateSettingAsync("news", Valid());

        Assert.True(result.Succeeded);
        var news = (await service.GetSettingsAsync()).Single(s => s.Category == "news");
        Assert.False(news.InstagramEnabled);
        Assert.False(news.RequireApproval);
        Assert.Equal("portrait", news.ImageSize);
        Assert.Equal("#112233", news.BrandColor);
        Assert.NotNull(news.UpdatedDate);
        Assert.Equal(1, await db.SocialShareSettings.CountAsync());

        // Saving again updates the same row.
        await service.UpdateSettingAsync("news", Valid());
        Assert.Equal(1, await db.SocialShareSettings.CountAsync());
    }

    [Theory]
    [InlineData("InvalidCategory", "gold", null, null, null)]
    [InlineData("InvalidColor", "news", "red", null, null)]
    [InlineData("InvalidColor", "news", null, "#12345", null)]
    [InlineData("InvalidImageSize", "news", null, null, "banner")]
    public async Task UpdateSettings_RejectsBadInput(string code, string category, string? brand, string? accent, string? size)
    {
        var (service, _) = Create();
        var request = Valid();
        if (brand is not null) request.BrandColor = brand;
        if (accent is not null) request.AccentColor = accent;
        if (size is not null) request.ImageSize = size;

        var result = await service.UpdateSettingAsync(category, request);
        Assert.False(result.Succeeded);
        Assert.Equal(code, result.ErrorCode);
    }

    [Theory]
    [InlineData("<script>alert(1)</script>")]
    [InlineData("<div>{title}</div>")]
    [InlineData("<img src=x>")]
    public async Task UpdateSettings_RejectsTelegramTagsThatTelegramWouldRefuse(string template)
    {
        var (service, _) = Create();
        var request = Valid();
        request.TelegramTemplate = template;
        Assert.Equal("InvalidTemplate", (await service.UpdateSettingAsync("job", request)).ErrorCode);
    }

    [Fact]
    public async Task UpdateSettings_RejectsLogoThatIsNotAnUrlOrSitePath()
    {
        var (service, _) = Create();
        var request = Valid();
        request.LogoUrl = "javascript:alert(1)";
        Assert.Equal("InvalidLogo", (await service.UpdateSettingAsync("job", request)).ErrorCode);
    }

    [Fact]
    public async Task ActivityLog_FiltersByStatusCategoryAndChannel_AndPages()
    {
        var (service, db) = Create();
        var now = DateTime.UtcNow;
        SocialShareJob Make(int i, string cat, string ch, int status) => new()
        {
            Category = cat, EntityId = i, Channel = ch, Status = status, Title = "T" + i, Url = "https://x.test/" + i,
            CreatedDate = now, UpdatedDate = now.AddMinutes(i),
        };
        db.SocialShareJobs.AddRange(Make(1, "job", "telegram", 2), Make(2, "job", "facebook", 3), Make(3, "news", "telegram", 3),
            Make(4, "news", "instagram", 0), Make(5, "news", "facebook", 1));
        await db.SaveChangesAsync();

        Assert.Equal(5, (await service.SearchAsync(null, null, null)).TotalCount);
        Assert.Equal(2, (await service.SearchAsync(3, null, null)).TotalCount);
        Assert.Equal(1, (await service.SearchAsync(3, "job", null)).TotalCount);
        Assert.Equal(2, (await service.SearchAsync(null, null, "telegram")).TotalCount);

        var page1 = await service.SearchAsync(null, null, null, page: 1, pageSize: 2);
        Assert.Equal(new[] { "T5", "T4" }, page1.Items.Select(i => i.Title));   // newest first
        Assert.Equal(3, page1.TotalPages);

        var summary = await service.GetSummaryAsync();
        Assert.Equal((1, 1, 1, 2, 0), (summary.AwaitingApproval, summary.Queued, summary.Posted, summary.Failed, summary.Skipped));
    }
}
