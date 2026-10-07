using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;

namespace JobPortal.Tests;

/// <summary>Auto-share step 4: image composition and hosting.</summary>
public class SocialImageTests
{
    private static readonly SocialDetail[] Details =
    {
        new("Organization", "GSSSB Gujarat"), new("Vacancies", "1,246"), new("Last date", "15 Oct 2026"),
    };

    private static SocialImageRequest Request(string title, string size = "square", byte[]? bg = null) =>
        new("job", title, Details, size, "#1D4ED8", "#F59E0B", bg, null, "JobCharcha", "jobcharcha.com");

    [Theory]
    [InlineData("square", 1080, 1080)]
    [InlineData("portrait", 1080, 1350)]
    public void Compose_ProducesJpegOfTheRequestedSize(string size, int w, int h)
    {
        var bytes = SocialImageComposer.Compose(Request("GSSSB Junior Clerk Recruitment 2026", size));
        using var bmp = SKBitmap.Decode(bytes);
        Assert.Equal(w, bmp.Width);
        Assert.Equal(h, bmp.Height);
    }

    [Fact]
    public void Compose_HandlesGujaratiLongTitlesAndHostileText_WithoutThrowing()
    {
        var gujarati = "ગુજરાત સરકારી સેવા પસંદગી મંડળ દ્વારા જુનિયર ક્લાર્ક ભરતી ૨૦૨૬ — ઓનલાઇન અરજી કરો " + string.Concat(Enumerable.Repeat("ભરતી ", 30));
        Assert.NotEmpty(SocialImageComposer.Compose(Request(gujarati)));
        Assert.NotEmpty(SocialImageComposer.Compose(Request("<script>alert(1)</script> " + new string('W', 400), "portrait")));
        Assert.NotEmpty(SocialImageComposer.Compose(Request("x") with { Details = Array.Empty<SocialDetail>() }));
    }

    [Fact]
    public void Compose_Gujarati_ActuallyDrawsGlyphs()
    {
        // A Gujarati-only title must leave visible ink (not blank/tofu-less empty) in the title band.
        using var withText = SKBitmap.Decode(SocialImageComposer.Compose(Request("ભરતી")));
        using var without = SKBitmap.Decode(SocialImageComposer.Compose(Request(" ")));
        var differing = 0;
        for (var y = 250; y < 420; y += 2)
            for (var x = 72; x < 500; x += 2)
                if (withText.GetPixel(x, y) != without.GetPixel(x, y)) differing++;
        Assert.True(differing > 200, $"expected visible Gujarati glyph pixels, saw {differing}");
    }

    [Fact]
    public void Runs_SplitScriptsAndKeepSpacesWithThePrecedingRun()
    {
        var runs = SocialFonts.Runs("GSSSB ભરતી 2026");
        Assert.Equal(new[] { false, true, false }.Length, runs.Count);
        Assert.False(runs[0].Gujarati);
        Assert.True(runs[1].Gujarati);
        Assert.Equal("GSSSB ", runs[0].Text);
    }

    [Fact]
    public void Wrap_BreaksOnWords_AndSplitsOversizedWords()
    {
        var lines = SocialFonts.Wrap("alpha beta gamma delta " + new string('M', 80), 60, 500, bold: true);
        Assert.True(lines.Count >= 3);
        Assert.All(lines, l => Assert.True(SocialFonts.Measure(l, 60, true) <= 500 + 1));
    }

    // ---- service ----------------------------------------------------------------

    private sealed class MemoryStorage : IFileStorageService
    {
        public List<byte[]> Saved { get; } = new();

        public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType, string folder)
        {
            using var ms = new MemoryStream();
            await fileStream.CopyToAsync(ms);
            Saved.Add(ms.ToArray());
            return $"/uploads/{folder}/{Saved.Count}.jpg";
        }

        public void Delete(string relativeUrl) { }
    }

    private static (SocialImageService Service, AppDbContext Db, MemoryStorage Storage) Setup()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var options = new SocialShareOptions { PublicBaseUrl = "https://example.test" };
        var storage = new MemoryStorage();
        var service = new SocialImageService(db, storage, new HttpClient(), options, NullLogger<SocialImageService>.Instance);
        return (service, db, storage);
    }

    private static async Task<SocialShareJob> AddJob(AppDbContext db, int entityId = 1, string channel = "telegram")
    {
        var job = new SocialShareJob
        {
            Category = "job", EntityId = entityId, Channel = channel, Title = "Clerk", Url = "https://example.test/jobs/a",
            DetailsJson = System.Text.Json.JsonSerializer.Serialize(Details), CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow,
        };
        db.SocialShareJobs.Add(job);
        await db.SaveChangesAsync();
        return job;
    }

    private static SocialShareSetting Setting() => new() { Category = "job", ImageSize = "square" };

    [Fact]
    public async Task ProducesTheDefaultTemplate()
    {
        var (service, db, _) = Setup();
        Assert.NotNull(await service.EnsureImageAsync(await AddJob(db), Setting()));
    }
}
