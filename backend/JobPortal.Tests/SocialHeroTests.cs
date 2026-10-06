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

/// <summary>An admin can
/// upload their own picture on a share that is waiting for approval.</summary>
public class SocialHeroTests
{

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

    private static byte[] Png(int w, int h, SKColor color)
    {
        using var bmp = new SKBitmap(w, h);
        bmp.Erase(color);
        using var img = SKImage.FromBitmap(bmp);
        return img.Encode(SKEncodedImageFormat.Png, 100).ToArray();
    }

    private sealed class Rig
    {
        public required AppDbContext Db { get; init; }
        public required MemoryStorage Storage { get; init; }
        public required SocialImageService Images { get; init; }
        public required SocialPreviewService Preview { get; init; }
    }

    private static Rig Build()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var options = new SocialShareOptions { PublicBaseUrl = "https://x.test" };
        var storage = new MemoryStorage();
        var images = new SocialImageService(db, storage, new HttpClient(), options, NullLogger<SocialImageService>.Instance);
        var social = new SocialShareService(db, options, NullLogger<SocialShareService>.Instance);
        return new Rig { Db = db, Storage = storage, Images = images, Preview = new SocialPreviewService(db, social, images, NullLogger<SocialPreviewService>.Instance) };
    }

    private static async Task<List<SocialShareJob>> AddShares(Rig r, int entityId = 1, int status = SocialShareStatus.AwaitingApproval)
    {
        var list = new List<SocialShareJob>();
        foreach (var ch in SocialChannels.All)
        {
            var j = new SocialShareJob
            {
                Category = "job", EntityId = entityId, Channel = ch, Status = status, Title = "Gujarat Anganwadi Recruitment 2026 - 6843 Posts",
                Url = "https://x.test/jobs/a", DetailsJson = "[{\"label\":\"Organization\",\"value\":\"WCD Gujarat\"}]",
                CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow,
            };
            r.Db.SocialShareJobs.Add(j);
            list.Add(j);
        }
        await r.Db.SaveChangesAsync();
        return list;
    }

    private static readonly SocialShareSetting Setting = SocialShareService.DefaultSetting("job");

    // ---- an admin-supplied picture ---------------------------------------------------------------

    [Fact]
    public async Task UploadedPicture_ReplacesTheImage_OnEveryChannelOfThatPost()
    {
        var r = Build();
        var shares = await AddShares(r);
        var other = (await AddShares(r, entityId: 2))[0];
        foreach (var s in shares) s.ImageUrl = "https://x.test/uploads/social/old.jpg";
        await r.Db.SaveChangesAsync();

        var result = await r.Preview.SetCustomHeroAsync(shares[0].Id, Png(1200, 800, SKColors.OrangeRed));

        Assert.True(result.Succeeded, result.Error);
        var saved = await r.Db.SocialShareJobs.AsNoTracking().ToListAsync();
        Assert.All(saved.Where(j => j.EntityId == 1), j => Assert.Equal(result.Data, j.ImageUrl));
        Assert.NotEqual("https://x.test/uploads/social/old.jpg", result.Data);
        Assert.Null(saved.Single(j => j.Id == other.Id).ImageUrl);             // another post is untouched
        using var composed = SKBitmap.Decode(r.Storage.Saved.Single());
        Assert.Equal((1080, 1350), (composed.Width, composed.Height));
    }

    [Theory]
    [InlineData("notapicture")]
    [InlineData("tiny")]
    public async Task UploadedPicture_IsValidated(string kind)
    {
        var r = Build();
        var share = (await AddShares(r))[0];
        var bytes = kind == "tiny" ? Png(50, 50, SKColors.Red) : System.Text.Encoding.UTF8.GetBytes("hello, I am not an image");

        var result = await r.Preview.SetCustomHeroAsync(share.Id, bytes);

        Assert.False(result.Succeeded);
        Assert.Equal("BadImage", result.ErrorCode);
        Assert.Empty(r.Storage.Saved);
    }

    [Fact]
    public async Task UploadedPicture_IsRefused_OnceTheShareIsNoLongerWaitingForApproval()
    {
        var r = Build();
        var posted = (await AddShares(r, status: SocialShareStatus.Posted))[0];

        Assert.Equal("NotAwaitingApproval", (await r.Preview.SetCustomHeroAsync(posted.Id, Png(1200, 800, SKColors.Red))).ErrorCode);
        Assert.Equal("NotFound", (await r.Preview.SetCustomHeroAsync(9999, Png(1200, 800, SKColors.Red))).ErrorCode);
    }
}
