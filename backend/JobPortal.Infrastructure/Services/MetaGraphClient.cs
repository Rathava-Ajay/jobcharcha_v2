using System.Text.Json;
using JobPortal.Application.Common;

namespace JobPortal.Infrastructure.Services;

public enum MetaTokenState { Unknown, Ok, ExpiringSoon, Expired, Invalid, NotConfigured }

/// <summary>What the admin sees about the Meta token. <see cref="Warning"/> is non-null whenever someone needs to act.</summary>
public record MetaTokenStatus(MetaTokenState State, DateTime? ExpiresAt, int? DaysLeft, string? Warning, string[] MissingPermissions);

public interface IMetaGraphClient
{
    /// <summary>Photo post on the Page. Returns the Facebook post id.</summary>
    Task<string> PostPagePhotoAsync(string imageUrl, string caption, CancellationToken ct = default);

    /// <summary>Text/link post on the Page (used when there is no image). Returns the Facebook post id.</summary>
    Task<string> PostPageFeedAsync(string message, string link, CancellationToken ct = default);

    /// <summary>Instagram: create a media container, wait until it is ready, then media_publish. Returns the media id.</summary>
    Task<string> PublishInstagramPhotoAsync(string imageUrl, string caption, CancellationToken ct = default);

    /// <summary>Uploads a picture as an UNPUBLISHED photo on the Page and returns Meta's public CDN link for it. Lets Facebook, Instagram and Telegram
    /// download images even when this site is not reachable from the internet (local testing). Nothing appears on the Page timeline.</summary>
    Task<string> HostImageAsync(byte[] jpeg, CancellationToken ct = default);

    Task<MetaTokenStatus> GetTokenStatusAsync(bool force = false, CancellationToken ct = default);
}

/// <summary>Meta Graph API: Facebook Page photo/feed posts and Instagram Business publishing. The access token is sent
/// in the POST body (never the URL) and error text is rebuilt from Graph's own message, so it can't leak.
/// Required permissions: pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish.</summary>
public class MetaGraphClient : IMetaGraphClient
{
    public static readonly string[] RequiredPermissions = { "pages_manage_posts", "pages_read_engagement", "instagram_content_publish" };

    // Graph error codes that mean "try again later" (rate limits / temporary issues).
    private static readonly HashSet<int> TransientCodes = new() { 1, 2, 4, 17, 32, 341, 613 };

    private readonly HttpClient _http;
    private readonly SocialShareOptions _options;
    private readonly MetaTokenCache _cache;
    private MetaTokenStatus? _cached { get => _cache.Status; set => _cache.Status = value; }
    private DateTime _cachedAt { get => _cache.At; set => _cache.At = value; }

    /// <summary>How long to wait between Instagram container status checks. Tests set this to zero.</summary>
    public TimeSpan PollDelay { get; set; } = TimeSpan.FromSeconds(2);
    public int PollAttempts { get; set; } = 8;

    public MetaGraphClient(HttpClient http, SocialShareOptions options, MetaTokenCache cache)
    {
        _http = http;
        _options = options;
        _cache = cache;
    }

    private string Base => $"https://graph.facebook.com/{_options.MetaGraphVersion}";

    // ---- Facebook ------------------------------------------------------------------------------

    public async Task<string> PostPagePhotoAsync(string imageUrl, string caption, CancellationToken ct = default)
    {
        RequireFacebook();
        using var json = await SendAsync(HttpMethod.Post, $"{Base}/{_options.MetaPageId}/photos",
            new() { ["url"] = imageUrl, ["caption"] = caption, ["published"] = "true" }, ct);
        var root = json.RootElement;
        // post_id is the feed story ("pageid_postid"); id is just the photo object.
        return Str(root, "post_id") ?? Str(root, "id") ?? throw new SocialShareException("Facebook returned no post id.", retryable: false);
    }

    public async Task<string> PostPageFeedAsync(string message, string link, CancellationToken ct = default)
    {
        RequireFacebook();
        using var json = await SendAsync(HttpMethod.Post, $"{Base}/{_options.MetaPageId}/feed",
            new() { ["message"] = message, ["link"] = link }, ct);
        return Str(json.RootElement, "id") ?? throw new SocialShareException("Facebook returned no post id.", retryable: false);
    }

    public async Task<string> HostImageAsync(byte[] jpeg, CancellationToken ct = default)
    {
        RequireFacebook();
        using var form = new MultipartFormDataContent
        {
            { new StringContent("false"), "published" },
            { new StringContent(_options.MetaPageAccessToken!), "access_token" },
            { new ByteArrayContent(jpeg), "source", "share.jpg" },
        };

        HttpResponseMessage response;
        try { response = await _http.PostAsync($"{Base}/{_options.MetaPageId}/photos", form, ct); }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new SocialShareException("Could not reach Meta to host the share image (network error or timeout).", retryable: true);
        }

        string photoId;
        using (response)
        {
            var text = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(text);
            if (!response.IsSuccessStatusCode || !doc.RootElement.TryGetProperty("id", out var idEl))
            {
                var message = doc.RootElement.TryGetProperty("error", out var err) ? Str(err, "message") : null;
                throw new SocialShareException($"Meta could not host the share image ({(int)response.StatusCode}): {message ?? "unknown error"}", (int)response.StatusCode >= 500);
            }
            photoId = idEl.ToString();
        }

        using var info = await SendAsync(HttpMethod.Get, $"{Base}/{photoId}", new() { ["fields"] = "images" }, ct);
        if (info.RootElement.TryGetProperty("images", out var images) && images.ValueKind == JsonValueKind.Array && images.GetArrayLength() > 0
            && Str(images[0], "source") is { Length: > 0 } source)
            return source;
        throw new SocialShareException("Meta did not return a link for the hosted share image.", retryable: true);
    }

    // ---- Instagram -----------------------------------------------------------------------------

    public async Task<string> PublishInstagramPhotoAsync(string imageUrl, string caption, CancellationToken ct = default)
    {
        if (!_options.InstagramConfigured)
            throw new SocialShareException("Instagram isn't configured (META_PAGE_ACCESS_TOKEN / INSTAGRAM_ACCOUNT_ID).", retryable: false);

        string creationId;
        using (var container = await SendAsync(HttpMethod.Post, $"{Base}/{_options.InstagramAccountId}/media",
                   new() { ["image_url"] = imageUrl, ["caption"] = caption }, ct))
        {
            creationId = Str(container.RootElement, "id")
                         ?? throw new SocialShareException("Instagram returned no media container id.", retryable: false);
        }

        await WaitUntilReadyAsync(creationId, ct);

        JsonDocument published;
        try
        {
            published = await SendAsync(HttpMethod.Post, $"{Base}/{_options.InstagramAccountId}/media_publish",
                new() { ["creation_id"] = creationId }, ct);
        }
        catch (SocialShareException ex) when (ex.Retryable)
        {
            // A timeout / 5xx here does not tell us whether Instagram already published the photo. Retrying would create a
            // second container and post the same image again, so stop and let an admin check Instagram.
            throw new SocialShareException(
                $"Instagram did not confirm the publish ({ex.Message}). It may already be live on Instagram — check, then press \"Mark as posted\" or \"Retry\".",
                retryable: false);
        }

        using var _ = published;
        return Str(published.RootElement, "id")
               ?? throw new SocialShareException("Instagram returned no media id.", retryable: false);
    }

    private async Task WaitUntilReadyAsync(string creationId, CancellationToken ct)
    {
        for (var i = 0; i < PollAttempts; i++)
        {
            using var status = await SendAsync(HttpMethod.Get, $"{Base}/{creationId}", new() { ["fields"] = "status_code,status" }, ct);
            switch (Str(status.RootElement, "status_code"))
            {
                case "FINISHED":
                    return;
                case "ERROR":
                case "EXPIRED":
                    throw new SocialShareException(
                        $"Instagram could not process the image ({Str(status.RootElement, "status") ?? Str(status.RootElement, "status_code")}).",
                        retryable: false);
            }
            if (PollDelay > TimeSpan.Zero) await Task.Delay(PollDelay, ct);
        }
        throw new SocialShareException("Instagram is still processing the image; will try again.", retryable: true);
    }

    // ---- Token status --------------------------------------------------------------------------

    public async Task<MetaTokenStatus> GetTokenStatusAsync(bool force = false, CancellationToken ct = default)
    {
        if (!_options.FacebookConfigured && !_options.InstagramConfigured)
            return new MetaTokenStatus(MetaTokenState.NotConfigured, null, null, null, Array.Empty<string>());

        if (!force && _cached is not null && DateTime.UtcNow - _cachedAt < TimeSpan.FromHours(1)) return _cached;

        MetaTokenStatus status;
        try
        {
            status = !string.IsNullOrEmpty(_options.MetaAppId) && !string.IsNullOrEmpty(_options.MetaAppSecret)
                ? await InspectWithDebugTokenAsync(ct)
                : await ProbeAsync(ct);
        }
        catch (SocialShareException ex) when (ex.Retryable)
        {
            // Couldn't ask Meta right now: keep the last known answer rather than flapping.
            return _cached ?? new MetaTokenStatus(MetaTokenState.Unknown, null, null, "Could not check the Meta token right now: " + ex.Message, Array.Empty<string>());
        }
        catch (SocialShareException ex)
        {
            status = Invalid(ex.Message);
        }

        _cached = status;
        _cachedAt = DateTime.UtcNow;
        return status;
    }

    /// <summary>Called by every Graph call when Meta says the token is bad, so the warning shows up immediately.</summary>
    private void NoteInvalidToken(string message)
    {
        _cached = Invalid(message);
        _cachedAt = DateTime.UtcNow;
    }

    private static MetaTokenStatus Invalid(string message) =>
        new(MetaTokenState.Invalid, null, null, "The Meta access token was rejected — generate a new long-lived token and update META_PAGE_ACCESS_TOKEN. (" + message + ")", Array.Empty<string>());

    private async Task<MetaTokenStatus> InspectWithDebugTokenAsync(CancellationToken ct)
    {
        using var json = await SendAsync(HttpMethod.Get, $"{Base}/debug_token",
            new() { ["input_token"] = _options.MetaPageAccessToken, ["access_token"] = $"{_options.MetaAppId}|{_options.MetaAppSecret}" },
            ct, includeToken: false);
        var data = json.RootElement.GetProperty("data");

        var valid = data.TryGetProperty("is_valid", out var v) && v.ValueKind == JsonValueKind.True;
        if (!valid) return Invalid("expired or revoked");

        var granted = new HashSet<string>();
        if (data.TryGetProperty("scopes", out var scopes) && scopes.ValueKind == JsonValueKind.Array)
            foreach (var s in scopes.EnumerateArray()) if (s.GetString() is { } name) granted.Add(name);
        var missing = RequiredPermissions.Where(p => !granted.Contains(p)).ToArray();

        // expires_at == 0 means a non-expiring (page) token.
        DateTime? expires = data.TryGetProperty("expires_at", out var e) && e.TryGetInt64(out var unix) && unix > 0
            ? DateTimeOffset.FromUnixTimeSeconds(unix).UtcDateTime : null;
        int? daysLeft = expires.HasValue ? (int)Math.Floor((expires.Value - DateTime.UtcNow).TotalDays) : null;

        if (expires.HasValue && daysLeft <= 0)
            return new(MetaTokenState.Expired, expires, daysLeft, "The Meta access token has expired — generate a new long-lived token.", missing);
        if (expires.HasValue && daysLeft <= _options.TokenWarnDays)
            return new(MetaTokenState.ExpiringSoon, expires, daysLeft, $"The Meta access token expires in {daysLeft} day(s) — generate a new long-lived token soon.", missing);

        var warning = missing.Length > 0 ? "The Meta token is missing permissions: " + string.Join(", ", missing) : null;
        return new(MetaTokenState.Ok, expires, daysLeft, warning, missing);
    }

    /// <summary>Without an app id/secret we can't read the expiry date, only whether the token still works.</summary>
    private async Task<MetaTokenStatus> ProbeAsync(CancellationToken ct)
    {
        using var _ = await SendAsync(HttpMethod.Get, $"{Base}/{_options.MetaPageId ?? "me"}", new() { ["fields"] = "id" }, ct);
        return new(MetaTokenState.Ok, null, null, null, Array.Empty<string>());
    }

    // ---- plumbing ------------------------------------------------------------------------------

    private void RequireFacebook()
    {
        if (!_options.FacebookConfigured)
            throw new SocialShareException("Facebook isn't configured (META_PAGE_ACCESS_TOKEN / META_PAGE_ID).", retryable: false);
    }

    private static string? Str(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind != JsonValueKind.Null ? p.ToString() : null;

    private async Task<JsonDocument> SendAsync(HttpMethod method, string url, Dictionary<string, string?> fields, CancellationToken ct, bool includeToken = true)
    {
        if (includeToken) fields["access_token"] = _options.MetaPageAccessToken;
        var form = fields.Where(f => f.Value is not null).Select(f => new KeyValuePair<string, string>(f.Key, f.Value!)).ToList();

        using var request = new HttpRequestMessage(method, url);
        if (method == HttpMethod.Get)
        {
            // GET has no body; Graph accepts the token as a query parameter, so build it without logging the URL anywhere.
            request.RequestUri = new Uri(url + "?" + string.Join("&", form.Select(f => $"{Uri.EscapeDataString(f.Key)}={Uri.EscapeDataString(f.Value)}")));
        }
        else
        {
            request.Content = new FormUrlEncodedContent(form);
        }

        HttpResponseMessage response;
        try
        {
            response = await _http.SendAsync(request, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new SocialShareException("Could not reach Meta (network error or timeout).", retryable: true);
        }

        using (response)
        {
            var status = (int)response.StatusCode;
            var text = await response.Content.ReadAsStringAsync(ct);
            JsonDocument doc;
            try { doc = JsonDocument.Parse(text); }
            catch (JsonException) { throw new SocialShareException($"Meta returned an unreadable response ({status}).", status >= 500); }

            if (response.IsSuccessStatusCode && !doc.RootElement.TryGetProperty("error", out _)) return doc;

            using (doc)
            {
                string message = "unknown error";
                int code = 0;
                var transient = false;
                if (doc.RootElement.TryGetProperty("error", out var err))
                {
                    message = Str(err, "message") ?? message;
                    if (err.TryGetProperty("code", out var c) && c.TryGetInt32(out var n)) code = n;
                    transient = err.TryGetProperty("is_transient", out var t) && t.ValueKind == JsonValueKind.True;
                }

                if (code == 190)
                {
                    NoteInvalidToken(message);
                    throw new SocialShareException($"Meta rejected the access token (190): {message}", retryable: false);
                }

                var retryable = transient || TransientCodes.Contains(code) || status >= 500;
                throw new SocialShareException($"Meta request failed ({status}, code {code}): {message}", retryable);
            }
        }
    }
}

/// <summary>Shared (singleton) memory of the last Meta token check, since the Graph client itself is transient.</summary>
public class MetaTokenCache
{
    public MetaTokenStatus? Status { get; set; }
    public DateTime At { get; set; }
}
