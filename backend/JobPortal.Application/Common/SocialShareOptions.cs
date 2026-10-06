namespace JobPortal.Application.Common;

/// <summary>Server-side credentials and limits for auto-sharing to Telegram / Facebook / Instagram. Secrets come
/// from environment variables only (TELEGRAM_BOT_TOKEN, ...); the non-secret knobs live under "SocialShare:*".
/// Any channel whose credentials are missing is reported as not configured and skipped, never errors the publish.</summary>
public class SocialShareOptions
{
    public string? TelegramBotToken { get; set; }
    public string? TelegramChannelId { get; set; }
    public string? MetaPageAccessToken { get; set; }
    public string? MetaPageId { get; set; }
    public string? InstagramAccountId { get; set; }
    /// <summary>Optional. With both set, the Meta token can be inspected via /debug_token (expiry date + granted permissions).</summary>
    public string? MetaAppId { get; set; }
    public string? MetaAppSecret { get; set; }

    public string MetaGraphVersion { get; set; } = "v21.0";
    public int MaxAttempts { get; set; } = 4;
    public int BaseBackoffSeconds { get; set; } = 60;
    /// <summary>Show the admin a warning when the Meta token expires within this many days.</summary>
    public int TokenWarnDays { get; set; } = 14;
    public bool WorkerEnabled { get; set; } = true;
    /// <summary>Where share images are hosted so Telegram / Facebook / Instagram can download them: "server" (this site's /uploads, needs a public
    /// PublicBaseUrl), "meta" (uploaded as a hidden photo on the Facebook Page and its CDN link used), or "auto" (meta when PublicBaseUrl is not
    /// publicly reachable, e.g. localhost; otherwise server).</summary>
    public string ImageHosting { get; set; } = "auto";
    /// <summary>Public site origin used for post links and for the image URLs Instagram fetches.</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:3000";
    /// <summary>Where THIS server's /uploads files are publicly served (the live site's address on the server; localhost on a dev machine). Used to build image
    /// links and to decide whether images need hosting through Meta. Defaults to <see cref="PublicBaseUrl"/>.</summary>
    public string? UploadsBaseUrl { get; set; }
    public string EffectiveUploadsBaseUrl => string.IsNullOrWhiteSpace(UploadsBaseUrl) ? PublicBaseUrl : UploadsBaseUrl!;

    public bool TelegramConfigured => Has(TelegramBotToken) && Has(TelegramChannelId);
    public bool FacebookConfigured => Has(MetaPageAccessToken) && Has(MetaPageId);
    public bool InstagramConfigured => Has(MetaPageAccessToken) && Has(InstagramAccountId);

    public bool IsConfigured(string channel) => channel switch
    {
        "telegram" => TelegramConfigured,
        "facebook" => FacebookConfigured,
        "instagram" => InstagramConfigured,
        _ => false,
    };

    private static bool Has(string? s) => !string.IsNullOrWhiteSpace(s);
}
