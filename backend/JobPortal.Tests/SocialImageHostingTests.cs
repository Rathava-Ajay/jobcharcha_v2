using System.Net;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPortal.Tests;

/// <summary>Instagram / Facebook / Telegram download the share image themselves, so it needs a public link. On a dev machine (localhost) the
/// image is hosted through Meta instead; on the real server it stays on the site's own /uploads.</summary>
public class SocialImageHostingTests
{
    [Theory]
    [InlineData("https://jobcharcha.com/uploads/a.jpg", true)]
    [InlineData("http://203.0.113.9/x.jpg", true)]
    [InlineData("http://localhost:3000/uploads/a.jpg", false)]
    [InlineData("http://127.0.0.1:5101/uploads/a.jpg", false)]
    [InlineData("http://192.168.1.20/a.jpg", false)]
    [InlineData("http://10.0.0.4/a.jpg", false)]
    [InlineData("http://172.20.1.1/a.jpg", false)]
    [InlineData("https://jobcharcha.test/a.jpg", false)]
    [InlineData("http://myserver/a.jpg", false)]
    [InlineData("ftp://jobcharcha.com/a.jpg", false)]
    [InlineData("/uploads/social/a.jpg", false)]
    [InlineData("", false)]
    public void PublicUrl_KnowsWhatTheInternetCanReach(string url, bool expected) => Assert.Equal(expected, PublicUrl.IsReachable(url));

    private sealed class FakeMeta : IMetaGraphClient
    {
        public int Hosted { get; private set; }
        public bool Fail { get; set; }
        public Task<string> HostImageAsync(byte[] jpeg, CancellationToken ct = default)
        {
            Hosted++;
            if (Fail) throw new SocialShareException("Meta is down", true);
            return Task.FromResult($"https://scontent.fbcdn.net/hosted-{Hosted}.jpg");
        }
        public Task<string> PostPagePhotoAsync(string imageUrl, string caption, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<string> PostPageFeedAsync(string message, string link, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<string> PublishInstagramPhotoAsync(string imageUrl, string caption, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<MetaTokenStatus> GetTokenStatusAsync(bool force = false, CancellationToken ct = default) => throw new NotSupportedException();
    }

    private sealed class MemoryStorage : IFileStorageService
    {
        public int Saved { get; private set; }
        public Task<string> SaveAsync(Stream fileStream, string fileName, string contentType, string folder) { Saved++; return Task.FromResult($"/uploads/{folder}/{Saved}.jpg"); }
        public void Delete(string relativeUrl) { }
    }

    private static (SocialImageService Images, AppDbContext Db, FakeMeta Meta, MemoryStorage Storage) Build(string uploadsBase, string hosting = "auto", bool facebook = true)
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var options = new SocialShareOptions
        {
            PublicBaseUrl = "https://jobcharcha.com", UploadsBaseUrl = uploadsBase, ImageHosting = hosting,
            MetaPageAccessToken = facebook ? "m" : null, MetaPageId = facebook ? "p" : null,
        };
        var meta = new FakeMeta();
        var storage = new MemoryStorage();
        var images = new SocialImageService(db, storage, new HttpClient(), options,
            NullLogger<SocialImageService>.Instance, meta);
        return (images, db, meta, storage);
    }


    private static async Task<SocialShareJob> AddJob(AppDbContext db, int entity = 1, string channel = "instagram", string? image = null)
    {
        var j = new SocialShareJob
        {
            Category = "job", EntityId = entity, Channel = channel, Title = "Anganwadi", Url = "https://jobcharcha.com/jobs/a", ImageUrl = image,
            DetailsJson = "[{\"label\":\"Last date\",\"value\":\"14 Oct 2026\"}]", CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow,
        };
        db.SocialShareJobs.Add(j);
        await db.SaveChangesAsync();
        return j;
    }

    private static readonly SocialShareSetting Setting = SocialShareService.DefaultSetting("job");

    [Fact]
    public async Task OnLocalhost_TheImageIsHostedThroughMeta_NotOnTheLocalDisk()
    {
        var (images, db, meta, storage) = Build("http://localhost:3002");
        var job = await AddJob(db);

        var url = await images.EnsureImageAsync(job, Setting);

        Assert.Equal("https://scontent.fbcdn.net/hosted-1.jpg", url);
        Assert.Equal(1, meta.Hosted);
        Assert.Equal(0, storage.Saved);
        Assert.True(PublicUrl.IsReachable(job.ImageUrl));
    }

    [Fact]
    public async Task OnTheRealServer_TheImageStaysOnTheSitesOwnUploads()
    {
        var (images, db, meta, storage) = Build("https://jobcharcha.com");
        var url = await images.EnsureImageAsync(await AddJob(db), Setting);

        Assert.Equal("https://jobcharcha.com/uploads/social/1.jpg", url);
        Assert.Equal(0, meta.Hosted);
        Assert.Equal(1, storage.Saved);
    }

    [Fact]
    public async Task HostingSetting_CanForceEitherWay()
    {
        var forcedMeta = Build("https://jobcharcha.com", hosting: "meta");
        await forcedMeta.Images.EnsureImageAsync(await AddJob(forcedMeta.Db), Setting);
        Assert.Equal(1, forcedMeta.Meta.Hosted);

        var forcedServer = Build("http://localhost:3002", hosting: "server");
        var url = await forcedServer.Images.EnsureImageAsync(await AddJob(forcedServer.Db), Setting);
        Assert.Equal(0, forcedServer.Meta.Hosted);
        Assert.StartsWith("http://localhost:3002/uploads/", url);
    }

    [Fact]
    public async Task NoFacebookPage_OrMetaDown_FallsBackToTheLocalFile()
    {
        var noPage = Build("http://localhost:3002", facebook: false);
        Assert.StartsWith("http://localhost:3002/uploads/", await noPage.Images.EnsureImageAsync(await AddJob(noPage.Db), Setting));

        var down = Build("http://localhost:3002");
        down.Meta.Fail = true;
        Assert.StartsWith("http://localhost:3002/uploads/", await down.Images.EnsureImageAsync(await AddJob(down.Db), Setting));
        Assert.Equal(1, down.Storage.Saved);
    }

    [Fact]
    public async Task OneHostedPicturePerPost_IsSharedByAllChannels()
    {
        var (images, db, meta, _) = Build("http://localhost:3002");
        var a = await AddJob(db, channel: "instagram");
        var b = await AddJob(db, channel: "facebook");

        var first = await images.EnsureImageAsync(a, Setting);
        var second = await images.EnsureImageAsync(b, Setting);

        Assert.Equal(first, second);
        Assert.Equal(1, meta.Hosted);
    }

    [Fact]
    public async Task AnOldLocalhostLink_IsRebuiltAndHostedAgain_AndNotReusedFromASibling()
    {
        var (images, db, meta, _) = Build("http://localhost:3002");
        var stale = await AddJob(db, channel: "instagram", image: "http://localhost:3002/uploads/social/old.jpg");
        var sibling = await AddJob(db, channel: "facebook", image: "http://localhost:3002/uploads/social/old.jpg");

        Assert.True(images.NeedsRehost(stale.ImageUrl));
        var url = await images.EnsureImageAsync(stale, Setting);

        Assert.Equal("https://scontent.fbcdn.net/hosted-1.jpg", url);
        Assert.Equal(1, meta.Hosted);
        Assert.False(images.NeedsRehost(url));
        Assert.NotNull(sibling);
    }

    [Fact]
    public void NeedsRehost_IsFalse_OnARealServer_AndForPublicLinks()
    {
        var server = Build("https://jobcharcha.com").Images;
        Assert.False(server.NeedsRehost("https://jobcharcha.com/uploads/social/a.jpg"));

        var local = Build("http://localhost:3002").Images;
        Assert.False(local.NeedsRehost("https://scontent.fbcdn.net/a.jpg"));
        Assert.False(local.NeedsRehost(null));
        Assert.True(local.NeedsRehost("http://localhost:3002/uploads/social/a.jpg"));
    }

    // ---- the Meta call itself ------------------------------------------------------------------

    private sealed class StubHandler : HttpMessageHandler
    {
        public List<(HttpMethod Method, string Url, string Body, string? ContentType)> Calls { get; } = new();
        public Queue<Func<HttpResponseMessage>> Replies { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(ct);
            Calls.Add((request.Method, request.RequestUri!.ToString(), body, request.Content?.Headers.ContentType?.MediaType));
            return Replies.Dequeue()();
        }
    }

    private static HttpResponseMessage Json(HttpStatusCode code, string json) => new(code) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    [Fact]
    public async Task HostImage_UploadsAnUnpublishedPhoto_AndReturnsTheCdnLink_WithoutTheTokenInTheUrl()
    {
        var handler = new StubHandler();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"id":"555"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"images":[{"source":"https://scontent.fbcdn.net/big.jpg"},{"source":"https://scontent.fbcdn.net/small.jpg"}],"id":"555"}"""));
        var client = new MetaGraphClient(new HttpClient(handler), new SocialShareOptions { MetaPageAccessToken = "SECRET", MetaPageId = "page1" }, new MetaTokenCache());

        var url = await client.HostImageAsync(new byte[] { 1, 2, 3 });

        Assert.Equal("https://scontent.fbcdn.net/big.jpg", url);
        Assert.Equal("multipart/form-data", handler.Calls[0].ContentType);
        Assert.EndsWith("/page1/photos", handler.Calls[0].Url);
        Assert.DoesNotContain("SECRET", handler.Calls[0].Url);
        Assert.Contains("published", handler.Calls[0].Body);
        Assert.Contains("false", handler.Calls[0].Body);                         // never shown on the Page timeline
    }

    [Fact]
    public async Task HostImage_ReportsMetaErrors_WithoutLeakingTheToken()
    {
        var handler = new StubHandler();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.BadRequest, """{"error":{"message":"(#200) permission denied","code":200}}"""));
        var client = new MetaGraphClient(new HttpClient(handler), new SocialShareOptions { MetaPageAccessToken = "SECRET", MetaPageId = "page1" }, new MetaTokenCache());

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.HostImageAsync(new byte[] { 1 }));

        Assert.False(ex.Retryable);
        Assert.Contains("permission denied", ex.Message);
        Assert.DoesNotContain("SECRET", ex.Message);
    }
}
