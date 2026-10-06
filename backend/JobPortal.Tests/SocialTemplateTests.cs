using JobPortal.Application.Common;
using JobPortal.Application.DTOs.News;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;

namespace JobPortal.Tests;

/// <summary>Six colour templates, used in rotation: post 1 -> template 1, post 2 -> template 2, ... post 7 -> template 1 again.</summary>
public class SocialTemplateTests
{
    private static (AppDbContext Db, NewsService News, SocialShareService Social) Build()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var options = new SocialShareOptions { TelegramBotToken = "t", TelegramChannelId = "@c", MetaPageAccessToken = "m", MetaPageId = "p", InstagramAccountId = "i", PublicBaseUrl = "https://x.test" };
        var social = new SocialShareService(db, options, NullLogger<SocialShareService>.Instance);
        return (db, new NewsService(db, social), social);
    }

    private static UpsertNewsRequest Post(string title, bool skip = false) => new() { Title = title, Summary = "s", Content = "c", IsActive = true, SkipSocial = skip };

    private static async Task<int> PublishAndGetTemplate(AppDbContext db, NewsService news, string title)
    {
        var id = (await news.CreateAsync(Post(title), "a")).Data!.Id;
        var templates = await db.SocialShareJobs.AsNoTracking().Where(j => j.EntityId == id).Select(j => j.Template).Distinct().ToListAsync();
        return Assert.Single(templates)!.Value;                      // every channel of one post uses the same template
    }

    [Fact]
    public async Task Posts_RotateThroughTheSixTemplates_AndWrapAround()
    {
        var (db, news, _) = Build();
        var used = new List<int>();
        for (var i = 1; i <= 8; i++) used.Add(await PublishAndGetTemplate(db, news, $"Post {i}"));

        Assert.Equal(new[] { 0, 1, 2, 3, 4, 5, 0, 1 }, used);
    }

    [Fact]
    public async Task SkippedPosts_DoNotUseUpASlot()
    {
        var (db, news, _) = Build();
        Assert.Equal(0, await PublishAndGetTemplate(db, news, "first"));
        await news.CreateAsync(Post("skipped", skip: true), "a");
        await news.CreateAsync(new UpsertNewsRequest { Title = "draft", Summary = "s", Content = "c", IsActive = false }, "a");
        Assert.Equal(1, await PublishAndGetTemplate(db, news, "second"));
    }

    [Fact]
    public async Task ShareAgain_GetsTheNextTemplate_SoARepostLooksDifferent()
    {
        var (db, news, social) = Build();
        var id = (await news.CreateAsync(Post("Repost me"), "a")).Data!.Id;
        foreach (var j in await db.SocialShareJobs.ToListAsync()) j.Status = SocialShareStatus.Posted;
        await db.SaveChangesAsync();

        Assert.True((await social.ShareAgainAsync("news", id, "admin")).Succeeded);

        var gens = await db.SocialShareJobs.AsNoTracking().Where(j => j.EntityId == id).GroupBy(j => j.Generation)
            .Select(g => new { Generation = g.Key, Templates = g.Select(x => x.Template).Distinct().ToList() }).OrderBy(g => g.Generation).ToListAsync();
        Assert.Equal(new int?[] { 0 }, gens[0].Templates);
        Assert.Equal(new int?[] { 1 }, gens[1].Templates);
    }

    [Fact]
    public async Task NextTemplate_ReportsWhatTheNextPostWillUse()
    {
        var (db, news, _) = Build();
        Assert.Equal(0, await SocialShareService.NextTemplateAsync(db));
        await PublishAndGetTemplate(db, news, "a");
        await PublishAndGetTemplate(db, news, "b");
        Assert.Equal(2, await SocialShareService.NextTemplateAsync(db));
    }

    // ---- the templates themselves -------------------------------------------------------------

    private static readonly SocialDetail[] Details =
    {
        new("Organization", "Women & Child Development Department, Gujarat"), new("Vacancies", "6,843 Posts"),
        new("Qualification", "12th Pass"), new("Last date", "15 Oct 2026"),
    };

    private static SKBitmap Render(int template, string? brand = null, string? accent = null) =>
        SKBitmap.Decode(SocialImageComposer.Compose(new SocialImageRequest("job", "Gujarat Anganwadi Recruitment 2026 - 6843 Posts", Details,
            "portrait", brand, accent, null, null, "JobCharcha", "jobcharcha.com", template)));

    [Fact]
    public void ThereAreSixDistinctTemplates_WithNames()
    {
        Assert.Equal(6, SocialTheme.Count);
        Assert.Equal(6, SocialTheme.All.Select(t => t.Name).Distinct().Count());
        Assert.Equal(6, SocialTheme.All.Select(t => t.BannerFill).Distinct().Count());     // six different main colours
        Assert.Same(SocialTheme.For(0), SocialTheme.For(6));                                 // wraps
        Assert.Same(SocialTheme.For(5), SocialTheme.For(-1));
    }

    [Fact]
    public void EachTemplateRendersWithItsOwnColours_ButTheSameLayout()
    {
        var bannerPixels = new List<SKColor>();
        var pagePixels = new List<SKColor>();
        for (var t = 0; t < 6; t++)
        {
            using var bmp = Render(t);
            Assert.Equal((1080, 1350), (bmp.Width, bmp.Height));
            bannerPixels.Add(bmp.GetPixel(60, 300));        // inside the banner, left of the text
            pagePixels.Add(bmp.GetPixel(10, 1335));         // page background in the bottom-left corner
        }

        Assert.Equal(6, bannerPixels.Select(p => (p.Red / 24, p.Green / 24, p.Blue / 24)).Distinct().Count());
        // The dark template has a dark page, the others a light one.
        Assert.True(pagePixels[5].Red < 60 && pagePixels[5].Blue < 100, "template 6 should be the dark one");
        Assert.All(pagePixels.Take(5), p => Assert.True(p.Red > 200));
    }

    [Fact]
    public void BrandColours_StillOverrideATemplate_WhenTheAdminSetsThem()
    {
        using var plain = Render(2);
        using var custom = Render(2, brand: "#008000", accent: "#FF00FF");

        var banner = custom.GetPixel(60, 300);
        Assert.True(banner.Green > 100 && banner.Red < 60, $"expected a green banner, got {banner}");
        Assert.NotEqual(plain.GetPixel(60, 300), banner);
    }
}
