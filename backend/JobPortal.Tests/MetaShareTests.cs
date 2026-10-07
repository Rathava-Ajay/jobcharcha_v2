using System.Net;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;

namespace JobPortal.Tests;

/// <summary>Auto-share step 5: Facebook / Instagram publishing, captions, and the Meta token warning.</summary>
public class MetaShareTests
{
    private sealed class StubHandler : HttpMessageHandler
    {
        public List<(HttpMethod Method, string Url, string Body)> Calls { get; } = new();
        public Queue<Func<HttpResponseMessage>> Replies { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls.Add((request.Method, request.RequestUri!.ToString(), request.Content is null ? "" : await request.Content.ReadAsStringAsync(ct)));
            return Replies.Dequeue()();
        }
    }

    private static HttpResponseMessage Json(HttpStatusCode code, string json) =>
        new(code) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static SocialShareOptions Options(bool app = false) => new()
    {
        MetaPageAccessToken = "SECRET-TOKEN", MetaPageId = "page1", InstagramAccountId = "ig1",
        MetaAppId = app ? "app" : null, MetaAppSecret = app ? "secret" : null, TokenWarnDays = 14,
    };

    private static (MetaGraphClient Client, StubHandler Handler) Create(SocialShareOptions? options = null)
    {
        var handler = new StubHandler();
        var client = new MetaGraphClient(new HttpClient(handler), options ?? Options(), new MetaTokenCache()) { PollDelay = TimeSpan.Zero };
        return (client, handler);
    }

    // ---- Facebook ---------------------------------------------------------------------------------

    [Fact]
    public async Task FacebookPhoto_PostsToThePage_AndReturnsThePostId_WithTokenInBodyNotUrl()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"id":"photo9","post_id":"page1_555"}"""));

        var id = await client.PostPagePhotoAsync("https://x.test/i.jpg", "Hello");

        Assert.Equal("page1_555", id);
        var call = Assert.Single(handler.Calls);
        Assert.Equal(HttpMethod.Post, call.Method);
        Assert.EndsWith("/v21.0/page1/photos", call.Url);
        Assert.DoesNotContain("SECRET-TOKEN", call.Url);
        Assert.Contains("access_token=SECRET-TOKEN", call.Body);
        Assert.Contains("url=https%3A%2F%2Fx.test%2Fi.jpg", call.Body);
    }

    [Fact]
    public async Task FacebookFeed_UsedWhenThereIsNoImage()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"id":"page1_77"}"""));

        Assert.Equal("page1_77", await client.PostPageFeedAsync("Hi", "https://x.test/p"));
        Assert.EndsWith("/page1/feed", handler.Calls[0].Url);
        Assert.Contains("link=https%3A%2F%2Fx.test%2Fp", handler.Calls[0].Body);
    }

    // ---- Instagram --------------------------------------------------------------------------------

    [Fact]
    public async Task Instagram_CreatesContainer_WaitsForFinished_ThenPublishes()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"id":"container1"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"status_code":"IN_PROGRESS"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"status_code":"FINISHED"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"id":"media42"}"""));

        var id = await client.PublishInstagramPhotoAsync("https://x.test/i.jpg", "caption");

        Assert.Equal("media42", id);
        Assert.Equal(4, handler.Calls.Count);
        Assert.EndsWith("/ig1/media", handler.Calls[0].Url);
        Assert.Contains("image_url=", handler.Calls[0].Body);
        Assert.Equal(HttpMethod.Get, handler.Calls[1].Method);
        Assert.Contains("/container1?", handler.Calls[1].Url);
        Assert.EndsWith("/ig1/media_publish", handler.Calls[3].Url);
        Assert.Contains("creation_id=container1", handler.Calls[3].Body);
    }

    [Fact]
    public async Task Instagram_ContainerError_IsNotRetryable_AndNeverPublishes()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"id":"c1"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"status_code":"ERROR","status":"Error: Media upload has failed"}"""));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.PublishInstagramPhotoAsync("https://x.test/i.jpg", "c"));
        Assert.False(ex.Retryable);
        Assert.Equal(2, handler.Calls.Count);
    }

    [Fact]
    public async Task Instagram_StillProcessingAfterPolling_IsRetryable()
    {
        var (client, handler) = Create();
        client.PollAttempts = 2;
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"id":"c1"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"status_code":"IN_PROGRESS"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"status_code":"IN_PROGRESS"}"""));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.PublishInstagramPhotoAsync("https://x.test/i.jpg", "c"));
        Assert.True(ex.Retryable);
    }

    // ---- error classification --------------------------------------------------------------------

    [Theory]
    [InlineData(4, true)]      // application request limit reached
    [InlineData(17, true)]     // user request limit reached
    [InlineData(2, true)]      // temporary service error
    [InlineData(100, false)]   // invalid parameter
    [InlineData(200, false)]   // permission missing
    public async Task GraphErrorCodes_AreClassifiedAsRetryableOrNot(int code, bool retryable)
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.BadRequest, $$$"""{"error":{"message":"boom","type":"OAuthException","code":{{{code}}}}}"""));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.PostPageFeedAsync("m", "https://x.test"));
        Assert.Equal(retryable, ex.Retryable);
        Assert.DoesNotContain("SECRET-TOKEN", ex.Message);
    }

    [Fact]
    public async Task NetworkError_IsRetryable_AndDoesNotLeakTheToken()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => throw new HttpRequestException("failed https://graph.facebook.com/?access_token=SECRET-TOKEN"));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.PostPageFeedAsync("m", "https://x.test"));
        Assert.True(ex.Retryable);
        Assert.DoesNotContain("SECRET-TOKEN", ex.Message);
    }

    [Fact]
    public async Task UnconfiguredChannels_FailFastWithoutCallingOut()
    {
        var (client, handler) = Create(new SocialShareOptions());
        await Assert.ThrowsAsync<SocialShareException>(() => client.PostPagePhotoAsync("u", "c"));
        await Assert.ThrowsAsync<SocialShareException>(() => client.PublishInstagramPhotoAsync("u", "c"));
        Assert.Empty(handler.Calls);
    }

    // ---- token warnings --------------------------------------------------------------------------

    private static long InDays(int days) => DateTimeOffset.UtcNow.AddDays(days).ToUnixTimeSeconds();

    private static string DebugToken(long expiresAt, string scopes = "\"pages_manage_posts\",\"pages_read_engagement\",\"instagram_content_publish\"", bool valid = true) =>
        $$$"""{"data":{"is_valid":{{{valid.ToString().ToLowerInvariant()}}},"expires_at":{{{expiresAt}}},"scopes":[{{{scopes}}}]}}""";

    [Fact]
    public async Task TokenExpiringSoon_ProducesAWarningWithDaysLeft()
    {
        var (client, handler) = Create(Options(app: true));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, DebugToken(InDays(5) + 3600)));

        var status = await client.GetTokenStatusAsync();
        Assert.Equal(MetaTokenState.ExpiringSoon, status.State);
        Assert.Equal(5, status.DaysLeft);
        Assert.Contains("expires in 5 day", status.Warning);
        Assert.Matches(@"access_token=app(%7C|\|)secret", handler.Calls[0].Url); // app token, not the page token
    }

    [Fact]
    public async Task TokenWithNoExpiry_IsOk_ButMissingPermissionsAreFlagged()
    {
        var (client, handler) = Create(Options(app: true));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, DebugToken(0, scopes: "\"pages_manage_posts\"")));

        var status = await client.GetTokenStatusAsync();
        Assert.Equal(MetaTokenState.Ok, status.State);
        Assert.Null(status.DaysLeft);
        Assert.Contains("instagram_content_publish", status.Warning);
        Assert.Equal(new[] { "pages_read_engagement", "instagram_content_publish" }, status.MissingPermissions);
    }

    [Fact]
    public async Task ExpiredOrRevokedToken_IsReportedAsInvalid()
    {
        var (client, handler) = Create(Options(app: true));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, DebugToken(InDays(-2), valid: false)));

        var status = await client.GetTokenStatusAsync();
        Assert.Equal(MetaTokenState.Invalid, status.State);
        Assert.Contains("rejected", status.Warning);
    }

    [Fact]
    public async Task WithoutAppCredentials_AProbeDetectsADeadToken()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.BadRequest, """{"error":{"message":"Error validating access token: Session has expired","code":190}}"""));

        var status = await client.GetTokenStatusAsync();
        Assert.Equal(MetaTokenState.Invalid, status.State);
        Assert.NotNull(status.Warning);
    }

    [Fact]
    public async Task ARejectedPost_ImmediatelyFlipsTheCachedTokenStatus()
    {
        var cache = new MetaTokenCache();
        var handler = new StubHandler();
        var client = new MetaGraphClient(new HttpClient(handler), Options(), cache) { PollDelay = TimeSpan.Zero };
        handler.Replies.Enqueue(() => Json(HttpStatusCode.BadRequest, """{"error":{"message":"Session has expired","code":190}}"""));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.PostPageFeedAsync("m", "https://x.test"));
        Assert.False(ex.Retryable);
        Assert.Equal(MetaTokenState.Invalid, (await client.GetTokenStatusAsync()).State); // served from cache, no HTTP call
        Assert.Single(handler.Calls);
    }

    [Fact]
    public async Task NoMetaCredentials_ReportsNotConfigured_WithoutAWarning()
    {
        var (client, _) = Create(new SocialShareOptions());
        var status = await client.GetTokenStatusAsync();
        Assert.Equal(MetaTokenState.NotConfigured, status.State);
        Assert.Null(status.Warning);
    }

    // ---- captions --------------------------------------------------------------------------------

    private static readonly SocialDetail[] Details =
    {
        new("Organization", "GSSSB"), new("Vacancies", "120"), new("Last date", "15 Oct 2026"),
    };

    [Fact]
    public void Caption_ContainsTitleDetailsLinkAndCategoryHashtags()
    {
        var text = CaptionBuilder.Build("job", null, null, "Junior Clerk 2026", "https://x.test/jobs/a", Details);

        Assert.StartsWith("🆕 Junior Clerk 2026", text);
        Assert.Contains("👥 Vacancies: 120", text);
        Assert.Contains("https://x.test/jobs/a", text);
        Assert.DoesNotContain("Qualification", text);
        Assert.Contains("#GovtJobs", text);
        Assert.EndsWith("#JobCharcha", text);
    }

    [Fact]
    public void Hashtags_AreCleanedDeduplicatedAndCappedAt30()
    {
        var many = string.Join(" ", Enumerable.Range(1, 60).Select(i => $"#tag{i}"));
        var tags = CaptionBuilder.Hashtags(many + " #TAG1 ##Bad-Tag! #ગુજરાત", "job");

        Assert.Equal(30, tags.Count);
        Assert.Equal(tags.Count, tags.Select(t => t.ToLowerInvariant()).Distinct().Count());

        var cleaned = CaptionBuilder.Hashtags("##Bad-Tag!, #ગુજરાત  #bad_tag", "job");
        Assert.Equal(new[] { "#BadTag", "#ગુજરાત", "#bad_tag" }, cleaned);
    }

    [Fact]
    public void Caption_NeverExceedsInstagramLimits_EvenWithHugeInput()
    {
        var huge = new SocialDetail[] { new("Summary", new string('x', 5000)), new("Organization", new string('y', 5000)) };
        var tags = string.Join(" ", Enumerable.Range(1, 100).Select(i => "#t" + i));
        var template = "{title}\n{summary}\n{organization}\n{url}";

        var text = CaptionBuilder.Build("news", template, tags, "Title", "https://x.test/news/a", huge);

        Assert.True(text.Length <= CaptionBuilder.InstagramLimit, $"caption was {text.Length} chars");
        Assert.True(text.Split('#').Length - 1 <= CaptionBuilder.MaxHashtags);
    }

    [Fact]
    public void Caption_KeepsTheLinkAndTitle_WhenTrimmingToFit()
    {
        var long1 = new SocialDetail[] { new("Organization", new string('o', 900)), new("Vacancies", new string('v', 900)), new("Qualification", new string('q', 900)) };
        var text = CaptionBuilder.Build("job", null, null, "My Title", "https://x.test/jobs/keep", long1);

        Assert.True(text.Length <= CaptionBuilder.InstagramLimit);
        Assert.Contains("My Title", text);
        Assert.Contains("https://x.test/jobs/keep", text);
    }

    [Fact]
    public void Caption_UsesCustomTemplateAndHashtagPlaceholder()
    {
        var text = CaptionBuilder.Build("job", "{title} — {last_date}\n{hashtags}\n{url}", "alpha beta", "T", "https://x.test", Details);
        Assert.Equal("T — 15 Oct 2026\n#alpha #beta\nhttps://x.test", text);
    }

    // ---- channels --------------------------------------------------------------------------------

    private sealed class FakeMeta : IMetaGraphClient
    {
        public List<string> Calls { get; } = new();
        public Task<string> HostImageAsync(byte[] jpeg, CancellationToken ct = default) => Task.FromResult("https://scontent.fbcdn.net/hosted.jpg");
        public Task<string> PostPagePhotoAsync(string imageUrl, string caption, CancellationToken ct = default) { Calls.Add("photo:" + caption); return Task.FromResult("fb-photo"); }
        public Task<string> PostPageFeedAsync(string message, string link, CancellationToken ct = default) { Calls.Add("feed:" + link); return Task.FromResult("fb-feed"); }
        public Task<string> PublishInstagramPhotoAsync(string imageUrl, string caption, CancellationToken ct = default) { Calls.Add("ig:" + caption); return Task.FromResult("ig-1"); }
        public Task<MetaTokenStatus> GetTokenStatusAsync(bool force = false, CancellationToken ct = default) =>
            Task.FromResult(new MetaTokenStatus(MetaTokenState.Ok, null, null, null, Array.Empty<string>()));
    }

    private static SocialShareJob ShareJob(string? image, string? message = null) => new()
    {
        Category = "job", Title = "Clerk", Url = "https://x.test/jobs/a", ImageUrl = image, Message = message,
        DetailsJson = System.Text.Json.JsonSerializer.Serialize(Details),
    };

    [Fact]
    public async Task FacebookChannel_PhotoWhenImage_FeedWhenNot_AndPrefersApprovedMessage()
    {
        var meta = new FakeMeta();
        var channel = new FacebookChannel(meta);
        var setting = new SocialShareSetting { Category = "job" };

        Assert.Equal("fb-photo", await channel.PostAsync(ShareJob("https://x.test/i.jpg", message: "APPROVED TEXT"), setting, default));
        Assert.Equal("fb-feed", await channel.PostAsync(ShareJob(null), setting, default));
        Assert.Equal("photo:APPROVED TEXT", meta.Calls[0]);
        Assert.Equal("feed:https://x.test/jobs/a", meta.Calls[1]);
    }

    [Fact]
    public async Task InstagramChannel_RequiresAnImage_AndPublishesWithTheBuiltCaption()
    {
        var meta = new FakeMeta();
        var channel = new InstagramChannel(meta);
        var setting = new SocialShareSetting { Category = "job" };

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => channel.PostAsync(ShareJob(null), setting, default));
        Assert.False(ex.Retryable);

        Assert.Equal("ig-1", await channel.PostAsync(ShareJob("https://x.test/i.jpg"), setting, default));
        Assert.StartsWith("ig:🆕 Clerk", meta.Calls.Single());
    }
}
