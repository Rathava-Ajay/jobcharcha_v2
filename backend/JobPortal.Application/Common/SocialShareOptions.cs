namespace JobPortal.Application.Common;

/// <summary>Server-side credentials and limits for auto-sharing to Telegram / Facebook / Instagram. Secrets come
/// from environment variables only (TELEGRAM_BOT_TOKEN, ...); the non-secret knobs live under "SocialShare:*".
/// Any channel whose credentials are missing is reported as not configured and skipped, never errors the publish.</summary>
public class SocialShareOptions
{
    public string? TelegramBotToken { get; set; }
    public string? TelegramChannelId { get; set; }
    public string? OpenAiApiKey { get; set; }
    public string? MetaPageAccessToken { get; set; }
    public string? MetaPageId { get; set; }
    public string? InstagramAccountId { get; set; }
    /// <summary>Optional. With both set, the Meta token can be inspected via /debug_token (expiry date + granted permissions).</summary>
    public string? MetaAppId { get; set; }
    public string? MetaAppSecret { get; set; }

    public string OpenAiImageModel { get; set; } = "gpt-image-1";
    public string MetaGraphVersion { get; set; } = "v21.0";
    public int DailyImageCap { get; set; } = 20;
    public int MaxAttempts { get; set; } = 4;
    public int BaseBackoffSeconds { get; set; } = 60;
    /// <summary>Show the admin a warning when the Meta token expires within this many days.</summary>
    public int TokenWarnDays { get; set; } = 14;
    public bool WorkerEnabled { get; set; } = true;
    /// <summary>Public site origin used for post links and for the image URLs Instagram fetches.</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:3000";

    public bool TelegramConfigured => Has(TelegramBotToken) && Has(TelegramChannelId);
    public bool FacebookConfigured => Has(MetaPageAccessToken) && Has(MetaPageId);
    public bool InstagramConfigured => Has(MetaPageAccessToken) && Has(InstagramAccountId);
    public bool OpenAiConfigured => Has(OpenAiApiKey);

    public bool IsConfigured(string channel) => channel switch
    {
        "telegram" => TelegramConfigured,
        "facebook" => FacebookConfigured,
        "instagram" => InstagramConfigured,
        _ => false,
    };

    private static bool Has(string? s) => !string.IsNullOrWhiteSpace(s);
}
