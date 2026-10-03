using System.Net;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;

namespace JobPortal.Tests;

/// <summary>Auto-share step 3: Telegram templates are escaped and tidy, and the client reports errors usefully.</summary>
public class TelegramShareTests
{
    private static readonly SocialDetail[] JobDetails =
    {
        new("Organization", "GSSSB <Gujarat> & Co"),
        new("Vacancies", "120"),
        new("Last date", "15 Oct 2026"),
    };

    [Fact]
    public void Render_EscapesPostData_ButKeepsTemplateMarkup()
    {
        var text = TelegramMessageRenderer.Render("job", null, "Clerk <script>alert(1)</script> & more", "https://x.test/jobs/a", JobDetails, asCaption: false);

        Assert.Contains("<b>Clerk &lt;script&gt;alert(1)&lt;/script&gt; &amp; more</b>", text);
        Assert.Contains("GSSSB &lt;Gujarat&gt; &amp; Co", text);
        Assert.DoesNotContain("<script>", text);
        Assert.Contains("Last date: <b>15 Oct 2026</b>", text);
    }

    [Fact]
    public void Render_DropsLines_WhoseValuesAreMissing()
    {
        var text = TelegramMessageRenderer.Render("job", null, "Clerk", "https://x.test", JobDetails, asCaption: false);

        Assert.Contains("Vacancies: 120", text);
        Assert.DoesNotContain("Qualification", text);   // no qualification detail supplied
        Assert.DoesNotContain("{", text);
        Assert.DoesNotContain("\n\n\n", text);
    }

    [Fact]
    public void Render_UsesCustomTemplate_AndIgnoresUnknownPlaceholders()
    {
        var text = TelegramMessageRenderer.Render("job", "🔥 {title}\n{nope}\nApply: {url}", "Clerk", "https://x.test/jobs/a", JobDetails, asCaption: false);
        Assert.Equal("🔥 Clerk\nApply: https://x.test/jobs/a", text);
    }

    [Fact]
    public void Render_Caption_NeverExceedsTelegramLimit()
    {
        var longDetails = Enumerable.Range(0, 30).Select(i => new SocialDetail("Summary", new string('x', 300))).Take(1).ToList();
        var template = "<b>{title}</b>\n" + string.Join("\n", Enumerable.Repeat("{summary}", 12));
        var text = TelegramMessageRenderer.Render("news", template, "Title", "https://x.test", longDetails, asCaption: true);

        Assert.True(text.Length <= TelegramMessageRenderer.CaptionLimit);
        Assert.StartsWith("<b>Title</b>", text);
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        public List<(string Url, string Body)> Calls { get; } = new();
        public Queue<Func<HttpResponseMessage>> Replies { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls.Add((request.RequestUri!.ToString(), request.Content is null ? "" : await request.Content.ReadAsStringAsync(ct)));
            return Replies.Dequeue()();
        }
    }

    private static HttpResponseMessage Json(HttpStatusCode code, string json) =>
        new(code) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static (TelegramClient Client, StubHandler Handler) Create()
    {
        var handler = new StubHandler();
        var options = new SocialShareOptions { TelegramBotToken = "SECRET-TOKEN", TelegramChannelId = "@chan" };
        return (new TelegramClient(new HttpClient(handler), options), handler);
    }

    [Fact]
    public async Task SendMessage_ReturnsMessageId_AndSendsHtmlWithLinkButton()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"ok":true,"result":{"message_id":4242}}"""));

        var id = await client.SendMessageAsync("<b>Hi</b>", "Open", "https://x.test/p");

        Assert.Equal("4242", id);
        var call = Assert.Single(handler.Calls);
        Assert.Contains("/botSECRET-TOKEN/sendMessage", call.Url);
        Assert.Contains("\"chat_id\":\"@chan\"", call.Body);
        Assert.Contains("\"parse_mode\":\"HTML\"", call.Body);
        Assert.Contains("\"url\":\"https://x.test/p\"", call.Body);
    }

    [Fact]
    public async Task BadMarkup_IsResentOnce_AsPlainText()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.BadRequest, """{"ok":false,"description":"Bad Request: can't parse entities: Unsupported start tag"}"""));
        handler.Replies.Enqueue(() => Json(HttpStatusCode.OK, """{"ok":true,"result":{"message_id":7}}"""));

        var id = await client.SendMessageAsync("<b>Tom &amp; Jerry</b>", "Open", "https://x.test");

        Assert.Equal("7", id);
        Assert.Equal(2, handler.Calls.Count);
        Assert.DoesNotContain("parse_mode", handler.Calls[1].Body);
        Assert.Equal("Tom & Jerry", System.Text.Json.JsonDocument.Parse(handler.Calls[1].Body).RootElement.GetProperty("text").GetString());
    }

    [Fact]
    public async Task RateLimit_IsRetryable_WithRetryAfter()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json((HttpStatusCode)429, """{"ok":false,"description":"Too Many Requests","parameters":{"retry_after":17}}"""));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.SendMessageAsync("x", "b", "https://x.test"));
        Assert.True(ex.Retryable);
        Assert.Equal(TimeSpan.FromSeconds(17), ex.RetryAfter);
    }

    [Fact]
    public async Task BadChat_IsNotRetryable()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => Json(HttpStatusCode.BadRequest, """{"ok":false,"description":"Bad Request: chat not found"}"""));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.SendMessageAsync("x", "b", "https://x.test"));
        Assert.False(ex.Retryable);
        Assert.Contains("chat not found", ex.Message);
    }

    [Fact]
    public async Task NetworkError_IsRetryable_AndNeverLeaksTheToken()
    {
        var (client, handler) = Create();
        handler.Replies.Enqueue(() => throw new HttpRequestException("failed to reach https://api.telegram.org/botSECRET-TOKEN/sendMessage"));

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.SendMessageAsync("x", "b", "https://x.test"));
        Assert.True(ex.Retryable);
        Assert.DoesNotContain("SECRET-TOKEN", ex.Message);
    }

    [Fact]
    public async Task UnconfiguredTelegram_FailsWithoutCallingOut()
    {
        var handler = new StubHandler();
        var client = new TelegramClient(new HttpClient(handler), new SocialShareOptions());

        var ex = await Assert.ThrowsAsync<SocialShareException>(() => client.SendMessageAsync("x", "b", "https://x.test"));
        Assert.False(ex.Retryable);
        Assert.Empty(handler.Calls);
    }

    private sealed class FakeTelegram : JobPortal.Application.Interfaces.ITelegramClient
    {
        public List<string> Sent { get; } = new();
        public bool PhotoFails { get; set; }

        public Task<string> SendMessageAsync(string html, string buttonText, string buttonUrl, CancellationToken ct = default)
        { Sent.Add("message"); return Task.FromResult("m1"); }

        public Task<string> SendPhotoAsync(string imageUrl, string captionHtml, string buttonText, string buttonUrl, CancellationToken ct = default)
        {
            if (PhotoFails) throw new SocialShareException("Telegram sendPhoto failed (400): wrong file identifier", false);
            Sent.Add("photo"); return Task.FromResult("p1");
        }
    }

    private static SocialShareJob ShareJob(string? image) => new()
    {
        Category = "job", Title = "Clerk", Url = "https://x.test/jobs/a", ImageUrl = image,
        DetailsJson = System.Text.Json.JsonSerializer.Serialize(JobDetails),
    };

    [Fact]
    public async Task Channel_UsesPhoto_WhenImageExists_OtherwiseText()
    {
        var tg = new FakeTelegram();
        var channel = new TelegramChannel(tg);
        var setting = new SocialShareSetting { Category = "job" };

        Assert.Equal("p1", await channel.PostAsync(ShareJob("https://x.test/i.jpg"), setting, default));
        Assert.Equal("m1", await channel.PostAsync(ShareJob(null), setting, default));
        Assert.Equal(new[] { "photo", "message" }, tg.Sent);
    }

    [Fact]
    public async Task Channel_FallsBackToText_WhenPhotoIsRejected()
    {
        var tg = new FakeTelegram { PhotoFails = true };
        var id = await new TelegramChannel(tg).PostAsync(ShareJob("https://x.test/i.jpg"), new SocialShareSetting { Category = "job" }, default);

        Assert.Equal("m1", id);
        Assert.Equal(new[] { "message" }, tg.Sent);
    }
}
