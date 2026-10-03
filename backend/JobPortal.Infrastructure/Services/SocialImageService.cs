using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

public interface ISocialImageService
{
    /// <summary>Returns the public URL of the share image for this job, generating it once. Reuses the image of a
    /// sibling channel job for the same post, and records the URL on the job. Returns null only if even the
    /// default template could not be produced — callers then fall back to text.</summary>
    Task<string?> EnsureImageAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default);
}

public class SocialImageService : ISocialImageService
{
    private const int MaxLogoBytes = 2 * 1024 * 1024;

    private readonly AppDbContext _db;
    private readonly IOpenAiImageClient _openAi;
    private readonly IFileStorageService _storage;
    private readonly HttpClient _http;
    private readonly SocialShareOptions _options;
    private readonly ILogger<SocialImageService> _logger;

    public SocialImageService(AppDbContext db, IOpenAiImageClient openAi, IFileStorageService storage, HttpClient http,
        SocialShareOptions options, ILogger<SocialImageService> logger)
    {
        _db = db;
        _openAi = openAi;
        _storage = storage;
        _http = http;
        _options = options;
        _logger = logger;
    }

    public async Task<string?> EnsureImageAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(job.ImageUrl)) return job.ImageUrl;

        // One picture per post and generation, shared by Telegram, Facebook and Instagram.
        var sibling = await _db.SocialShareJobs.AsNoTracking()
            .Where(j => j.Category == job.Category && j.EntityId == job.EntityId && j.Generation == job.Generation && j.ImageUrl != null)
            .Select(j => j.ImageUrl).FirstOrDefaultAsync(ct);
        if (sibling is not null)
        {
            job.ImageUrl = sibling;
            await _db.SaveChangesAsync(ct);
            return sibling;
        }

        try
        {
            var portrait = string.Equals(setting.ImageSize, "portrait", StringComparison.OrdinalIgnoreCase);
            var background = await TryGenerateBackgroundAsync(job.Category, setting, portrait, ct);
            var logo = await TryLoadLogoAsync(setting.LogoUrl, ct);

            var bytes = SocialImageComposer.Compose(new SocialImageRequest(
                job.Category, job.Title, SocialJobDetails.Read(job.DetailsJson), setting.ImageSize,
                setting.BrandColor, setting.AccentColor, background, logo,
                SiteName: "JobCharcha", Domain: DomainOf(_options.PublicBaseUrl)));

            await using var stream = new MemoryStream(bytes);
            var relative = await _storage.SaveAsync(stream, "share.jpg", "image/jpeg", "social");
            var url = relative.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? relative : _options.PublicBaseUrl + relative;

            job.ImageUrl = url;
            await _db.SaveChangesAsync(ct);
            return url;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Could not build the share image for {Category} #{Id}.", job.Category, job.EntityId);
            return null;
        }
    }

    /// <summary>The AI background, or null to use the branded default template (no key, daily cap hit, or API error).</summary>
    private async Task<byte[]?> TryGenerateBackgroundAsync(string category, SocialShareSetting setting, bool portrait, CancellationToken ct)
    {
        if (!_options.OpenAiConfigured) return null;
        if (!await TryReserveImageAsync(ct))
        {
            _logger.LogWarning("Daily OpenAI image cap ({Cap}) reached; using the default template.", _options.DailyImageCap);
            return null;
        }

        try
        {
            return await _openAi.GenerateBackgroundAsync(BuildPrompt(category, setting), portrait, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "OpenAI background generation failed; using the default template.");
            await ReleaseImageAsync();   // a failed call isn't billed — give the slot back
            return null;
        }
    }

    public static string BuildPrompt(string category, SocialShareSetting setting)
    {
        var subject = category switch
        {
            ContentCategories.Job => "a government job vacancy announcement",
            ContentCategories.Result => "an exam result announcement",
            ContentCategories.AdmitCard => "an exam admit card (hall ticket) announcement",
            ContentCategories.Scheme => "a government welfare scheme announcement",
            _ => "a news bulletin",
        };
        var style = string.IsNullOrWhiteSpace(setting.ImageStyle)
            ? "clean modern gradient with soft abstract shapes"
            : SocialText.Clean(setting.ImageStyle, 300);
        var colors = string.IsNullOrWhiteSpace(setting.BrandColor) ? "" : $" Dominant colour: {SocialText.Clean(setting.BrandColor, 9)}.";

        return $"Abstract background artwork for a social media post about {subject}. Style: {style}.{colors} " +
               "Keep the centre and lower half calm and uncluttered because text will be added on top later. " +
               "Do NOT include any text, letters, numbers, words, logos, watermarks or people's faces.";
    }

    /// <summary>Atomically-enough claim of one of today's image slots. The cap is a cost guard, not a security
    /// boundary, so a rare race that allows one extra image is acceptable.</summary>
    private async Task<bool> TryReserveImageAsync(CancellationToken ct)
    {
        var day = DateTime.UtcNow.Date;
        var usage = await _db.SocialImageUsages.FirstOrDefaultAsync(u => u.Day == day, ct);
        if (usage is null)
        {
            _db.SocialImageUsages.Add(new SocialImageUsage { Day = day, Count = 1 });
        }
        else
        {
            if (usage.Count >= _options.DailyImageCap) return false;
            usage.Count++;
        }
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task ReleaseImageAsync()
    {
        var day = DateTime.UtcNow.Date;
        var usage = await _db.SocialImageUsages.FirstOrDefaultAsync(u => u.Day == day);
        if (usage is { Count: > 0 })
        {
            usage.Count--;
            await _db.SaveChangesAsync();
        }
    }

    private async Task<byte[]?> TryLoadLogoAsync(string? logoUrl, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(logoUrl)) return null;
        try
        {
            var url = logoUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? logoUrl : _options.PublicBaseUrl + "/" + logoUrl.TrimStart('/');
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(10));
            var bytes = await _http.GetByteArrayAsync(url, cts.Token);
            return bytes.Length is > 0 and <= MaxLogoBytes ? bytes : null;
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            _logger.LogWarning("Could not load the share logo ({Reason}); using the text wordmark.", ex.GetType().Name);
            return null;
        }
    }

    private static string DomainOf(string baseUrl) =>
        Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri) ? uri.Host : baseUrl;
}
