using System.Net;
using System.Text;
using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.AdmitCards;
using JobPortal.Application.DTOs.GovtSchemes;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.DTOs.News;
using JobPortal.Application.DTOs.Results;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;

namespace JobPortal.Tests;

/// <summary>The whole auto-share workflow for all five categories, with the REAL services: publish through the category
/// service, build the preview (static poster + message), approve, post to Telegram / Facebook /
/// Instagram. Only the network is faked (a recording handler that answers like Telegram and Meta do), so every
/// request body can be inspected. Set AUTOSHARE_E2E_OUT to a folder to also dump the images and the full request transcript.</summary>
public class SocialShareEndToEndTests : IDisposable
{
    private const string PublicBase = "https://jobcharcha.test";

    private readonly string _uploads = Path.Combine(Path.GetTempPath(), "jp-e2e-" + Guid.NewGuid().ToString("N"));
    public void Dispose() { try { Directory.Delete(_uploads, true); } catch { /* best effort */ } }

    // ---- a fake internet that answers like the real APIs -----------------------------------------

    private sealed record Call(string Method, Uri Url, string Body);

    private sealed class FakeInternet : HttpMessageHandler
    {
        public List<Call> Calls { get; } = new();
        private int _tg, _fb, _container, _media;

        public IEnumerable<Call> To(string host, string pathEnd) => Calls.Where(c => c.Url.Host == host && c.Url.AbsolutePath.EndsWith(pathEnd));

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(ct);
            Calls.Add(new Call(request.Method.Method, request.RequestUri!, body));
            var u = request.RequestUri!;
            var path = u.AbsolutePath;

            if (u.Host == "api.telegram.org")
                return Json(HttpStatusCode.OK, "{\"ok\":true,\"result\":{\"message_id\":" + (1000 + ++_tg) + "}}");

            if (u.Host == "graph.facebook.com")
            {
                if (path.EndsWith("/page1/photos")) return Json(HttpStatusCode.OK, $$"""{"id":"photo{{++_fb}}","post_id":"page1_{{5000 + _fb}}"}""");
                if (path.EndsWith("/page1/feed")) return Json(HttpStatusCode.OK, $$"""{"id":"page1_{{5000 + ++_fb}}"}""");
                if (path.EndsWith("/ig1/media")) return Json(HttpStatusCode.OK, $$"""{"id":"container{{++_container}}"}""");
                if (path.EndsWith("/ig1/media_publish")) return Json(HttpStatusCode.OK, $$"""{"id":"ig-media-{{9000 + ++_media}}"}""");
                if (path.Contains("/container")) return Json(HttpStatusCode.OK, """{"status_code":"FINISHED"}""");
            }

            return Json(HttpStatusCode.NotFound, """{"error":{"message":"unexpected call"}}""");
        }

        private static HttpResponseMessage Json(HttpStatusCode code, string json) =>
            new(code) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    }

    // ---- the real system, wired the way DependencyInjection wires it ------------------------------

    private sealed class Rig
    {
        public required AppDbContext Db { get; init; }
        public required FakeInternet Net { get; init; }
        public required SocialShareProcessor Processor { get; init; }
        public required SocialShareService Social { get; init; }
        public required JobService Jobs { get; init; }
        public required ResultService Results { get; init; }
        public required AdmitCardService AdmitCards { get; init; }
        public required GovtSchemeService Schemes { get; init; }
        public required NewsService News { get; init; }
        public required AiUsageService Usage { get; init; }
    }

    private Rig Build()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.Categories.Add(new Category { Id = 1, Name = "GSSSB", Slug = "gsssb", Icon = "x", CreatedDate = DateTime.UtcNow, IsActive = true });
        db.SaveChanges();

        var options = new SocialShareOptions
        {
            TelegramBotToken = "TG-SECRET", TelegramChannelId = "@jobcharcha",
            MetaPageAccessToken = "META-SECRET", MetaPageId = "page1", InstagramAccountId = "ig1",
            PublicBaseUrl = PublicBase,
        };
        var net = new FakeInternet();
        var http = new HttpClient(net);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["FileStorage:RootPath"] = _uploads, ["FileStorage:PublicBasePath"] = "/uploads",
        }).Build();

        var usage = new AiUsageService(db, options, NullLogger<AiUsageService>.Instance);
        var images = new SocialImageService(db, new LocalFileStorageService(config), http, options, NullLogger<SocialImageService>.Instance);
        var channels = new ISocialChannel[]
        {
            new TelegramChannel(new TelegramClient(http, options)),
            new FacebookChannel(new MetaGraphClient(http, options, new MetaTokenCache()) { PollDelay = TimeSpan.Zero }),
            new InstagramChannel(new MetaGraphClient(http, options, new MetaTokenCache()) { PollDelay = TimeSpan.Zero }),
        };
        var processor = new SocialShareProcessor(db, channels, images, options, TimeProvider.System, NullLogger<SocialShareProcessor>.Instance);
        var social = new SocialShareService(db, options, NullLogger<SocialShareService>.Instance);

        return new Rig
        {
            Db = db, Net = net, Processor = processor, Social = social, Usage = usage,
            Jobs = new JobService(db, new FakeBackgroundTaskQueue(), social),
            Results = new ResultService(db, social),
            AdmitCards = new AdmitCardService(db, social),
            Schemes = new GovtSchemeService(db, social),
            News = new NewsService(db, social),
        };
    }

    /// <summary>Publishes one realistic post per category through the real category services.</summary>
    private static async Task<Dictionary<string, (int Id, string Title)>> PublishOnePerCategory(Rig r)
    {
        var posts = new Dictionary<string, (int, string)>();

        var job = await r.Jobs.CreateAsync(new UpsertJobRequest
        {
            Title = "GSSSB Junior Clerk Recruitment 2026 - 1246 Posts", OrganizationName = "Gujarat Subordinate Service Selection Board",
            CategoryId = 1, TotalPosts = 1246, QualificationRequired = "Graduation in any stream with CCC", Location = "Gandhinagar, Gujarat",
            LastDate = new DateTime(2026, 10, 25), ShortDescription = "Apply online for Junior Clerk posts.", IsActive = true, Status = 1,
        }, "admin-1");
        Assert.True(job.Succeeded, job.Error);
        posts["job"] = (job.Data!.Id, "GSSSB Junior Clerk Recruitment 2026 - 1246 Posts");

        var result = await r.Results.CreateAsync(new UpsertResultRequest
        {
            Title = "GPSC Class 1-2 Final Result 2026 Declared", OrganizationName = "Gujarat Public Service Commission", ExamName = "GPSC Class 1-2 Main Exam",
            CategoryId = 1, ResultDate = new DateTime(2026, 10, 3), CutOffMarks = "General 412, OBC 389, SC 356", IsActive = true,
        }, "admin-1");
        Assert.True(result.Succeeded, result.Error);
        posts["result"] = (result.Data!.Id, "GPSC Class 1-2 Final Result 2026 Declared");

        var card = await r.AdmitCards.CreateAsync(new UpsertAdmitCardRequest
        {
            Title = "Gujarat Police Constable Admit Card 2026 Released", OrganizationName = "Gujarat Police Recruitment Board", ExamName = "Lokrakshak Written Exam",
            CategoryId = 1, AdmitCardReleaseDate = new DateTime(2026, 10, 4), ExamDate = new DateTime(2026, 10, 19), IsActive = true,
        }, "admin-1");
        Assert.True(card.Succeeded, card.Error);
        posts["admitcard"] = (card.Data!.Id, "Gujarat Police Constable Admit Card 2026 Released");

        var scheme = await r.Schemes.CreateAsync(new UpsertGovtSchemeRequest
        {
            Title = "Mukhyamantri Yuva Swavalamban Yojana (MYSY) 2026", Ministry = "Education Department, Government of Gujarat", Category = "Education",
            Eligibility = "Gujarat students with 80% or more in HSC and family income up to 6 lakh", Benefits = "Tuition fee assistance up to 50 percent and hostel support",
            ApplyLink = "https://mysy.guj.nic.in", IsActive = true,
        }, "admin-1");
        Assert.True(scheme.Succeeded, scheme.Error);
        posts["scheme"] = (scheme.Data!.Id, "Mukhyamantri Yuva Swavalamban Yojana (MYSY) 2026");

        // A Gujarati headline: the photo and the messages must carry it intact.
        var news = await r.News.CreateAsync(new UpsertNewsRequest
        {
            Title = "ગુજરાત સરકારી ભરતી: GSSSB દ્વારા નવી પરીક્ષા તારીખો જાહેર",
            Summary = "GSSSB has announced the revised exam calendar for clerk and technical posts.", Content = "<p>Details inside.</p>", Source = "GSSSB", IsActive = true,
        }, "admin-1");
        Assert.True(news.Succeeded, news.Error);
        posts["news"] = (news.Data!.Id, "ગુજરાત સરકારી ભરતી: GSSSB દ્વારા નવી પરીક્ષા તારીખો જાહેર");

        return posts;
    }

    private static async Task DrainAsync(Rig r)
    {
        for (var i = 0; i < 10 && await r.Processor.RunOnceAsync() > 0; i++) { }
    }

    private static string Field(string body, string name)
    {
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty(name).GetString()!;
    }

    private static string FormField(string body, string name) =>
        body.Split('&').Select(p => p.Split('=', 2)).Where(p => p[0] == name).Select(p => Uri.UnescapeDataString(p[1].Replace('+', ' '))).First();

    // ================================================================================================

    [Fact]
    public async Task AllFiveCategories_PublishPreviewApprovePost_ToEveryChannel_WithPhotoAndMessage()
    {
        var r = Build();
        var posts = await PublishOnePerCategory(r);

        // 1. Publishing queued three shares per category, all waiting for approval (default mode).
        var queued = await r.Db.SocialShareJobs.ToListAsync();
        Assert.Equal(15, queued.Count);
        Assert.All(queued, j => Assert.Equal(SocialShareStatus.AwaitingApproval, j.Status));
        Assert.Empty(r.Net.Calls);                                    // publishing itself called no social API

        // 2. The worker builds the previews: one static poster per POST (shared by its 3 channels), a message per share.
        await DrainAsync(r);
        var previews = await r.Db.SocialShareJobs.AsNoTracking().ToListAsync();
        Assert.All(previews, j =>
        {
            Assert.Equal(SocialShareStatus.AwaitingApproval, j.Status);
            Assert.StartsWith($"{PublicBase}/uploads/social/", j.ImageUrl);
            Assert.False(string.IsNullOrWhiteSpace(j.Message));
        });
        Assert.Empty(r.Net.To("api.telegram.org", "/sendPhoto"));    // nothing is posted before approval

        // 3. Approve everything, as an admin would from the Activity Log.
        foreach (var j in previews) Assert.True((await r.Social.ApproveAsync(j.Id, null, "admin-1")).Succeeded);
        await DrainAsync(r);

        // 4. Every share posted, with the external id stored.
        var done = await r.Db.SocialShareJobs.AsNoTracking().ToListAsync();
        Assert.All(done, j => { Assert.Equal(SocialShareStatus.Posted, j.Status); Assert.False(string.IsNullOrEmpty(j.ExternalId)); Assert.Null(j.Error); });

        // 5. Telegram: a photo with a caption and a link button, per category.
        var telegram = r.Net.To("api.telegram.org", "/sendPhoto").ToList();
        Assert.Equal(5, telegram.Count);
        Assert.Empty(r.Net.To("api.telegram.org", "/sendMessage"));
        foreach (var (category, (id, title)) in posts)
        {
            var share = done.Single(j => j.Category == category && j.Channel == "telegram");
            var call = telegram.Single(c => Field(c.Body, "photo") == share.ImageUrl);
            var caption = Field(call.Body, "caption");
            Assert.Contains(System.Net.WebUtility.HtmlEncode(title).Replace("&#39;", "'").Replace("&quot;", "\""), caption.Replace("&amp;", "&amp;"));
            Assert.Contains($"\"url\":\"{PublicBase}/", call.Body);                       // the button links to the post
            Assert.Equal($"{PublicBase}/{PathFor(category)}/", share.Url[..(PublicBase.Length + PathFor(category).Length + 2)]);
            Assert.True(caption.Length <= 1024);
            Assert.EndsWith(1000 + telegram.IndexOf(call) + 1 + "", share.ExternalId!);
        }

        // 6. Facebook: a photo post with the caption, per category. Instagram: container + publish, per category.
        var fb = r.Net.To("graph.facebook.com", "/page1/photos").ToList();
        Assert.Equal(5, fb.Count);
        var igMedia = r.Net.To("graph.facebook.com", "/ig1/media").ToList();
        Assert.Equal(5, igMedia.Count);
        Assert.Equal(5, r.Net.To("graph.facebook.com", "/ig1/media_publish").Count());

        foreach (var call in igMedia)
        {
            var caption = FormField(call.Body, "caption");
            Assert.True(caption.Length <= 2200);
            Assert.InRange(caption.Split('#').Length - 1, 1, 30);
            Assert.Contains($"{PublicBase}/", caption);                                    // post link in the caption
            Assert.StartsWith($"{PublicBase}/uploads/social/", FormField(call.Body, "image_url"));
        }
        foreach (var call in fb) Assert.Contains(PublicBase, FormField(call.Body, "caption"));

        // 7. Secrets never travel in a URL (Graph tokens are in the POST body) and never leak into stored errors.
        Assert.DoesNotContain(r.Net.Calls.Where(c => c.Method == "POST" && c.Url.Host == "graph.facebook.com"), c => c.Url.Query.Contains("META-SECRET"));
        Assert.All(done, j => Assert.DoesNotContain("SECRET", j.Error ?? ""));

        // 8. The photos on disk are real 1080x1350 (4:5) JPEGs, one per post.
        var files = Directory.GetFiles(Path.Combine(_uploads, "social"), "*.jpg");
        Assert.Equal(5, files.Length);
        foreach (var f in files)
        {
            using var bmp = SKBitmap.Decode(f);
            Assert.Equal((1080, 1350), (bmp.Width, bmp.Height));      // portrait 4:5 is the default, like the account's feed
        }

        // 10. Running the worker again changes nothing: nothing is ever posted twice.
        var before = r.Net.Calls.Count;
        await DrainAsync(r);
        Assert.Equal(before, r.Net.Calls.Count);

        DumpArtifacts(r, files, "approval-mode");
    }

    [Fact]
    public async Task AutomaticMode_Portrait_PostsStraightAway_AndPostsWithoutApproval()
    {
        var r = Build();
        foreach (var c in SocialShareCategories.All)
            r.Db.SocialShareSettings.Add(new SocialShareSetting
            {
                Category = c, TelegramEnabled = true, InstagramEnabled = true, FacebookEnabled = true, RequireApproval = false,
                ImageSize = "portrait", BrandColor = "#0F766E", AccentColor = "#F43F5E", UpdatedDate = DateTime.UtcNow,
            });
        await r.Db.SaveChangesAsync();

        var posts = await PublishOnePerCategory(r);
        await DrainAsync(r);

        var shares = await r.Db.SocialShareJobs.AsNoTracking().ToListAsync();
        Assert.Equal(15, shares.Count);
        Assert.All(shares, j => Assert.Equal(SocialShareStatus.Posted, j.Status));                  // no approval step
        Assert.Equal(5, r.Net.To("graph.facebook.com", "/ig1/media_publish").Count());               // Instagram still got photos

        var files = Directory.GetFiles(Path.Combine(_uploads, "social"), "*.jpg");
        Assert.Equal(5, files.Length);
        foreach (var f in files)
        {
            using var bmp = SKBitmap.Decode(f);
            Assert.Equal((1080, 1350), (bmp.Width, bmp.Height));
        }
        Assert.Equal(posts.Count, shares.Select(s => s.Category).Distinct().Count());

        DumpArtifacts(r, files, "automatic-portrait-fallback");
    }

    [Fact]
    public async Task SkipSocial_And_ShareAgain_WorkOnARealPublishedPost()
    {
        var r = Build();
        var skipped = await r.News.CreateAsync(new UpsertNewsRequest { Title = "Skip me", Summary = "s", Content = "c", IsActive = true, SkipSocial = true }, "admin-1");
        Assert.True(skipped.Succeeded);
        Assert.Empty(await r.Db.SocialShareJobs.ToListAsync());

        var kept = await r.News.CreateAsync(new UpsertNewsRequest { Title = "Share me", Summary = "s", Content = "c", IsActive = true }, "admin-1");
        foreach (var j in await r.Db.SocialShareJobs.ToListAsync()) j.Status = SocialShareStatus.Posted;     // pretend the first round finished
        await r.Db.SaveChangesAsync();

        var again = await r.Social.ShareAgainAsync("news", kept.Data!.Id, "admin-1");
        Assert.True(again.Succeeded);
        await DrainAsync(r);

        Assert.Equal(3, await r.Db.SocialShareJobs.CountAsync(j => j.Generation == 1 && j.Status == SocialShareStatus.Posted));
        Assert.Single(r.Net.To("api.telegram.org", "/sendPhoto"));
    }

    private static string PathFor(string category) => category switch
    {
        "job" => "jobs", "result" => "results", "admitcard" => "admit-cards", "scheme" => "schemes", _ => "news",
    };

    /// <summary>Optional: AUTOSHARE_E2E_OUT=&lt;folder&gt; writes the generated photos and every API request for eyeballing.</summary>
    private static void DumpArtifacts(Rig r, string[] imageFiles, string scenario)
    {
        var root = Environment.GetEnvironmentVariable("AUTOSHARE_E2E_OUT");
        if (string.IsNullOrWhiteSpace(root)) return;

        var dir = Path.Combine(root, scenario);
        Directory.CreateDirectory(dir);
        foreach (var f in imageFiles) File.Copy(f, Path.Combine(dir, Path.GetFileName(f)), true);

        var shares = r.Db.SocialShareJobs.AsNoTracking().OrderBy(j => j.Category).ThenBy(j => j.Channel).ToList();
        var sb = new StringBuilder();
        foreach (var s in shares)
            sb.AppendLine($"=== {s.Category} / {s.Channel}  status={s.Status}  externalId={s.ExternalId}\nimage: {s.ImageUrl}\n{s.Message}\n");
        File.WriteAllText(Path.Combine(dir, "messages.txt"), sb.ToString());

        var calls = new StringBuilder();
        foreach (var c in r.Net.Calls)
            calls.AppendLine($"{c.Method} {c.Url.Host}{c.Url.AbsolutePath}\n  {(c.Body.Length > 600 ? c.Body[..600] + "…" : c.Body)}\n");
        File.WriteAllText(Path.Combine(dir, "api-calls.txt"), calls.ToString());
    }
}
