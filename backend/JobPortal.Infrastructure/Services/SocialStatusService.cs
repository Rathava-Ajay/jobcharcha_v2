using JobPortal.Application.Common;
using JobPortal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public record SocialChannelStatus(bool Configured, string? Hint);
public record SocialStatusDto(
    SocialChannelStatus Telegram, SocialChannelStatus Facebook, SocialChannelStatus Instagram,
    MetaTokenStatus MetaToken, List<string> Warnings, int NextTemplate, string[] TemplateNames);

/// <summary>Everything the admin "Auto-share status" panel needs: which channels have credentials and the Meta token health
/// with a ready-made list of warnings to show.</summary>
public class SocialStatusService
{
    private readonly AppDbContext _db;
    private readonly SocialShareOptions _options;
    private readonly IMetaGraphClient _meta;

    public SocialStatusService(AppDbContext db, SocialShareOptions options, IMetaGraphClient meta)
    {
        _db = db;
        _options = options;
        _meta = meta;
    }

    public async Task<SocialStatusDto> GetAsync(bool refreshToken = false, CancellationToken ct = default)
    {
        var token = await _meta.GetTokenStatusAsync(refreshToken, ct);

        var warnings = new List<string>();
        if (token.Warning is not null) warnings.Add(token.Warning);

        return new SocialStatusDto(
            new(_options.TelegramConfigured, _options.TelegramConfigured ? null : "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID."),
            new(_options.FacebookConfigured, _options.FacebookConfigured ? null : "Set META_PAGE_ACCESS_TOKEN and META_PAGE_ID."),
            new(_options.InstagramConfigured, _options.InstagramConfigured ? null : "Set META_PAGE_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID."),
            token, warnings,
            await NextTemplateOrZeroAsync(), SocialTheme.All.Select(t => t.Name).ToArray());
    }

    private async Task<int> NextTemplateOrZeroAsync()
    {
        try { return await SocialShareService.NextTemplateAsync(_db); }
        catch { return 0; }
    }
}
