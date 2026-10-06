using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <summary>"What would the share image for THIS post look like?" Builds the real image from the live post and its category
/// settings without queuing, saving or posting anything, so it works without any Telegram / Meta credentials and without the worker.</summary>
public class SocialPreviewService
{
    private readonly AppDbContext _db;
    private readonly ISocialShareService _social;
    private readonly ISocialImageService _images;
    private readonly ILogger<SocialPreviewService> _logger;

    public SocialPreviewService(AppDbContext db, ISocialShareService social, ISocialImageService images, ILogger<SocialPreviewService> logger)
    {
        _db = db;
        _social = social;
        _images = images;
        _logger = logger;
    }

    /// <param name="template">0-5 to force a colour template; null uses the one this post already has (or the next in the rotation).</param>
    public async Task<ServiceResult<byte[]>> RenderAsync(string category, int entityId, int? template = null, CancellationToken ct = default)
    {
        if (!SocialShareCategories.IsValid(category))
            return ServiceResult<byte[]>.Fail("InvalidCategory", "Unknown category.");

        var facts = await _social.GetPostFactsAsync(category, entityId);
        if (facts is null)
            return ServiceResult<byte[]>.Fail("NotFound", "That post does not exist or is not published.");

        var setting = await LoadSettingOrDefaultAsync(category, ct);

        var job = new SocialShareJob
        {
            Category = category, EntityId = entityId, Title = facts.Title, Url = facts.Url,
            DetailsJson = JsonSerializer.Serialize(facts.Details),
            Template = template is >= 0 and < SocialTheme.Count ? template : await TemplateForAsync(category, entityId, ct),
        };
        var bytes = await _images.RenderPreviewAsync(job, setting, ct);
        return bytes is null
            ? ServiceResult<byte[]>.Fail("RenderFailed", "Could not render the image. Check the API log.")
            : ServiceResult<byte[]>.Ok(bytes);
    }

    // ---- A picture supplied by the admin instead of the built-in sky strip --------------------------------

    public const int MaxHeroBytes = 10 * 1024 * 1024;

    /// <summary>Rebuilds the share image of a share waiting for approval around the admin's own picture, for that post's shares on
    /// every channel.</summary>
    public async Task<ServiceResult<string>> SetCustomHeroAsync(int shareId, byte[] picture, CancellationToken ct = default)
    {
        var share = await _db.SocialShareJobs.FirstOrDefaultAsync(j => j.Id == shareId, ct);
        if (share is null) return ServiceResult<string>.Fail("NotFound", "Share not found.");
        if (share.Status != SocialShareStatus.AwaitingApproval)
            return ServiceResult<string>.Fail("NotAwaitingApproval", "A picture can only be replaced while the share is waiting for approval.");
        if (picture.Length == 0 || picture.Length > MaxHeroBytes)
            return ServiceResult<string>.Fail("BadImage", "Choose a picture up to 10 MB.");

        SkiaSharp.SKBitmap? probe = null;
        try { probe = SkiaSharp.SKBitmap.Decode(picture); }          // throws (rather than returning null) for bytes that are not an image
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { probe = null; }
        using (probe)
        {
            if (probe is null) return ServiceResult<string>.Fail("BadImage", "That file is not a picture I can read. Use a JPG, PNG or WebP.");
            if (probe.Width < 400 || probe.Height < 200) return ServiceResult<string>.Fail("BadImage", "The picture is too small. Use at least 800 pixels wide.");
        }

        var setting = await LoadSettingOrDefaultAsync(share.Category, ct);
        var url = await _images.ApplyCustomHeroAsync(share, setting, picture, ct);
        if (url is null) return ServiceResult<string>.Fail("RenderFailed", "Could not build the image. Check the API log.");

        var siblings = await _db.SocialShareJobs
            .Where(j => j.Category == share.Category && j.EntityId == share.EntityId && j.Generation == share.Generation
                        && j.Status == SocialShareStatus.AwaitingApproval)
            .ToListAsync(ct);
        foreach (var s in siblings)
        {
            s.ImageUrl = url;
            s.UpdatedDate = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
        return ServiceResult<string>.Ok(url);
    }

    /// <summary>The category's saved look, or the defaults. A preview must still work when the Auto-share tables have not been
    /// created yet (migration not applied), so a failed read falls back to the defaults instead of failing the preview.</summary>
    private async Task<SocialShareSetting> LoadSettingOrDefaultAsync(string category, CancellationToken ct)
    {
        try
        {
            return await _db.SocialShareSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Category == category, ct)
                   ?? SocialShareService.DefaultSetting(category);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Could not read SocialShareSettings (is the AddSocialShare migration applied?); previewing with default settings.");
            return SocialShareService.DefaultSetting(category);
        }
    }

    private async Task<int> TemplateForAsync(string category, int entityId, CancellationToken ct)
    {
        try
        {
            var existing = await _db.SocialShareJobs.AsNoTracking().Where(j => j.Category == category && j.EntityId == entityId && j.Template != null)
                .OrderByDescending(j => j.Id).Select(j => j.Template).FirstOrDefaultAsync(ct);
            return existing ?? await SocialShareService.NextTemplateAsync(_db);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return 0;       // the Auto-share tables may not exist yet; a preview still works
        }
    }
}
