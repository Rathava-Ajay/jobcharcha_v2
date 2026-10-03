using System.Net.Http.Json;
using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.Interfaces;

namespace JobPortal.Infrastructure.Services;

public class TelegramClient : ITelegramClient
{
    private readonly HttpClient _http;
    private readonly SocialShareOptions _options;

    public TelegramClient(HttpClient http, SocialShareOptions options)
    {
        _http = http;
        _options = options;
    }

    public Task<string> SendMessageAsync(string html, string buttonText, string buttonUrl, CancellationToken ct = default) =>
        CallAsync("sendMessage", new Dictionary<string, object?>
        {
            ["text"] = html,
            ["parse_mode"] = "HTML",
            ["disable_web_page_preview"] = true,
            ["reply_markup"] = Button(buttonText, buttonUrl),
        }, "text", ct);

    public Task<string> SendPhotoAsync(string imageUrl, string captionHtml, string buttonText, string buttonUrl, CancellationToken ct = default) =>
        CallAsync("sendPhoto", new Dictionary<string, object?>
        {
            ["photo"] = imageUrl,
            ["caption"] = captionHtml,
            ["parse_mode"] = "HTML",
            ["reply_markup"] = Button(buttonText, buttonUrl),
        }, "caption", ct);

    private static object Button(string text, string url) =>
        new { inline_keyboard = new[] { new[] { new { text, url } } } };

    private async Task<string> CallAsync(string method, Dictionary<string, object?> body, string textField, CancellationToken ct)
    {
        if (!_options.TelegramConfigured)
            throw new SocialShareException("Telegram isn't configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID).", retryable: false);

        body["chat_id"] = _options.TelegramChannelId;
        var result = await PostAsync(method, body, ct);

        // Bad markup in an admin-edited template must not lose the post: resend once as plain text.
        if (!result.Ok && result.Description?.Contains("can't parse entities", StringComparison.OrdinalIgnoreCase) == true)
        {
            body.Remove("parse_mode");
            body[textField] = TelegramMessageRenderer.StripTags((string)body[textField]!);
            result = await PostAsync(method, body, ct);
        }

        if (result.Ok) return result.MessageId!;

        var retryable = result.Status == 429 || result.Status >= 500;
        TimeSpan? wait = result.RetryAfterSeconds is > 0 ? TimeSpan.FromSeconds(result.RetryAfterSeconds.Value) : null;
        throw new SocialShareException($"Telegram {method} failed ({result.Status}): {result.Description ?? "unknown error"}", retryable, wait);
    }

    private sealed record Reply(bool Ok, int Status, string? MessageId, string? Description, int? RetryAfterSeconds);

    private async Task<Reply> PostAsync(string method, Dictionary<string, object?> body, CancellationToken ct)
    {
        HttpResponseMessage response;
        try
        {
            // The token lives in the URL, so any exception text here could leak it — never forward ex.Message.
            response = await _http.PostAsJsonAsync($"https://api.telegram.org/bot{_options.TelegramBotToken}/{method}", body, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new SocialShareException("Could not reach Telegram (network error or timeout).", retryable: true);
        }

        using (response)
        {
            var status = (int)response.StatusCode;
            JsonDocument? doc = null;
            try { doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct); }
            catch (JsonException) { }

            using (doc)
            {
                if (doc is null) return new Reply(false, status, null, "unreadable response", null);
                var root = doc.RootElement;
                var ok = root.TryGetProperty("ok", out var okEl) && okEl.ValueKind == JsonValueKind.True;
                string? description = root.TryGetProperty("description", out var d) ? d.GetString() : null;
                int? retryAfter = root.TryGetProperty("parameters", out var p) && p.TryGetProperty("retry_after", out var ra) && ra.TryGetInt32(out var n) ? n : null;
                string? messageId = ok && root.TryGetProperty("result", out var r) && r.TryGetProperty("message_id", out var mid) ? mid.GetRawText() : null;
                return new Reply(ok && messageId is not null, status, messageId, description, retryAfter);
            }
        }
    }
}
