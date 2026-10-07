using JobPortal.Application.Common;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Infrastructure;

public static class SocialShareOptionsFactory
{
    public static SocialShareOptions Create(IConfiguration c)
    {
        static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
        static int Int(string? s, int fallback) => int.TryParse(s, out var n) && n > 0 ? n : fallback;

        var o = new SocialShareOptions
        {
            TelegramBotToken = Clean(c["TELEGRAM_BOT_TOKEN"]),
            TelegramChannelId = Clean(c["TELEGRAM_CHANNEL_ID"]),
            MetaPageAccessToken = Clean(c["META_PAGE_ACCESS_TOKEN"]),
            MetaPageId = Clean(c["META_PAGE_ID"]),
            InstagramAccountId = Clean(c["INSTAGRAM_ACCOUNT_ID"]),
            MetaAppId = Clean(c["META_APP_ID"]),
            MetaAppSecret = Clean(c["META_APP_SECRET"]),
            PublicBaseUrl = (Clean(c["App:FrontendBaseUrl"]) ?? "http://localhost:3000").TrimEnd('/'),
            UploadsBaseUrl = (Clean(c["SocialShare:UploadsBaseUrl"]) ?? Clean(c["App:FrontendBaseUrl"]))?.TrimEnd('/'),
        };
        o.MetaGraphVersion = Clean(c["SocialShare:MetaGraphVersion"]) ?? o.MetaGraphVersion;
        o.MaxAttempts = Math.Min(Int(c["SocialShare:MaxAttempts"], o.MaxAttempts), 5);
        o.BaseBackoffSeconds = Int(c["SocialShare:BaseBackoffSeconds"], o.BaseBackoffSeconds);
        o.TokenWarnDays = Int(c["SocialShare:TokenWarnDays"], o.TokenWarnDays);
        o.WorkerEnabled = !string.Equals(c["SocialShare:WorkerEnabled"], "false", StringComparison.OrdinalIgnoreCase);
        o.ImageHosting = Clean(c["SocialShare:ImageHosting"])?.ToLowerInvariant() is "server" or "meta" ? Clean(c["SocialShare:ImageHosting"])!.ToLowerInvariant() : "auto";
        if (Clean(c["SocialShare:PublicBaseUrl"]) is { } pub) o.PublicBaseUrl = pub.TrimEnd('/');
        return o;
    }
}
