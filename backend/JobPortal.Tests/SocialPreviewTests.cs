using JobPortal.Application.Common;
using JobPortal.Application.DTOs.News;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;

namespace JobPortal.Tests;

/// <summary>"Preview image" for an already-published post: works with no social credentials and no worker.</summary>
public class SocialPreviewTests
{

    private sealed class NoStorage : IFileStorageService
    {
        public Task<string> SaveAsync(Stream fileStream, string fileName, string contentType, string folder) => throw new InvalidOperationException("a preview must not save files");
        public void Delete(string relativeUrl) { }
    }

    private static (SocialPreviewService Preview, NewsService News, JobPortal.Infrastructure.Data.AppDbContext Db) Build()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        // A bare local machine: no Telegram / Meta credentials at all.
        var options = new SocialShareOptions { PublicBaseUrl = "http://localhost:3000" };
        var images = new SocialImageService(db, new NoStorage(), new HttpClient(), options, NullLogger<SocialImageService>.Instance);
        var social = new SocialShareService(db, options, NullLogger<SocialShareService>.Instance);
        return (new SocialPreviewService(db, social, images, NullLogger<SocialPreviewService>.Instance), new NewsService(db, social), db);
    }

    [Fact]
    public async Task Preview_RendersTheRealPost_WithoutCredentials_OrStoringAnything()
    {
        var (preview, news, db) = Build();
        var id = (await news.CreateAsync(new UpsertNewsRequest { Title = "Gujarat Anganwadi Recruitment 2026 - 6843 Worker & Helper Posts", Summary = "s", Content = "c", IsActive = true }, "a")).Data!.Id;

        var result = await preview.RenderAsync("news", id);

        Assert.True(result.Succeeded);
        using var bmp = SKBitmap.Decode(result.Data!);
        Assert.Equal((1080, 1350), (bmp.Width, bmp.Height));      // portrait 4:5 is the default, like the account's feed
        Assert.Empty(await db.AiUsageLogs.ToListAsync());
    }

    [Fact]
    public async Task Preview_RefusesUnknownCategoriesAndUnpublishedPosts()
    {
        var (preview, news, _) = Build();
        var draft = (await news.CreateAsync(new UpsertNewsRequest { Title = "Draft", Summary = "s", Content = "c", IsActive = false }, "a")).Data!.Id;

        Assert.Equal("InvalidCategory", (await preview.RenderAsync("oldpaper", 1)).ErrorCode);
        Assert.Equal("NotFound", (await preview.RenderAsync("news", draft)).ErrorCode);
        Assert.Equal("NotFound", (await preview.RenderAsync("news", 9999)).ErrorCode);
    }

    /// <summary>A database where the Auto-share tables were never created (migration not applied).</summary>
    private sealed class NoSocialTablesDb : JobPortal.Infrastructure.Data.AppDbContext
    {
        public NoSocialTablesDb(DbContextOptions<JobPortal.Infrastructure.Data.AppDbContext> o) : base(o) { }
        public override DbSet<SocialShareSetting> SocialShareSettings => throw new InvalidOperationException("Invalid object name 'SocialShareSettings'.");
    }

    [Fact]
    public async Task Preview_StillWorks_WhenTheAutoShareMigrationWasNeverApplied()
    {
        var name = TestDb.NewDbName();
        var plain = TestDb.Create(name);
        var options = new DbContextOptionsBuilder<JobPortal.Infrastructure.Data.AppDbContext>().UseInMemoryDatabase(name).Options;
        await using var db = new NoSocialTablesDb(options);

        var cfg = new SocialShareOptions { PublicBaseUrl = "http://localhost:3000" };
        var social = new SocialShareService(db, cfg, NullLogger<SocialShareService>.Instance);
        var images = new SocialImageService(db, new NoStorage(), new HttpClient(), cfg, NullLogger<SocialImageService>.Instance);
        var id = (await new NewsService(db, social).CreateAsync(new UpsertNewsRequest { Title = "Anganwadi", Summary = "s", Content = "c", IsActive = true }, "a")).Data!.Id;

        var result = await new SocialPreviewService(db, social, images, NullLogger<SocialPreviewService>.Instance).RenderAsync("news", id);

        Assert.True(result.Succeeded);
        Assert.NotEmpty(result.Data!);
        Assert.NotNull(plain);
    }
}
