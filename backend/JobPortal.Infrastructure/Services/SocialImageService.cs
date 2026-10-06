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

    /// <summary>Renders the exact image a share of this post would get, without saving it or touching any share row.</summary>
    Task<byte[]?> RenderPreviewAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default);

    /// <summary>Composes and stores the final share image around a picture the admin supplied,
    /// and returns its public URL. Does not touch any share row. Null when it could not be built.</summary>
    Task<string?> ApplyCustomHeroAsync(SocialShareJob job, SocialShareSetting setting, byte[] hero, CancellationToken ct = default);

    /// <summary>True when this image link cannot be downloaded by Telegram / Facebook / Instagram from where the site runs (for example a
    /// localhost link made before hosting was fixed), so the image must be rebuilt and hosted again.</summary>
    bool NeedsRehost(string? imageUrl);

    /// <summary>Why the last <see cref="EnsureImageAsync"/> call returned null (exception type and message); null when it succeeded.</summary>
    string? LastError => null;
}

public class SocialImageService : ISocialImageService
{
    private const int MaxLogoBytes = 2 * 1024 * 1024;


    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly HttpClient _http;
    private readonly SocialShareOptions _options;
    private readonly ILogger<SocialImageService> _logger;
    private readonly IMetaGraphClient? _meta;
    private readonly SocialPosterService? _posters;

    public string? LastError { get; private set; }

    public SocialImageService(AppDbContext db, IFileStorageService storage, HttpClient http,
        SocialShareOptions options, ILogger<SocialImageService> logger, IMetaGraphClient? meta = null, SocialPosterService? posters = null)
    {
        _db = db;
        _storage = storage;
        _http = http;
        _options = options;
        _logger = logger;
        _meta = meta;
        _posters = posters;
    }

    /// <summary>True when images are hosted through Meta instead of this site's own /uploads: forced by SocialShare:ImageHosting=meta, or chosen
    /// automatically when the site's public address is not reachable from the internet (localhost), as long as a Facebook Page is configured.</summary>
    private bool UseMetaHosting =>
        _meta is not null && _options.FacebookConfigured &&
        (_options.ImageHosting == "meta" || (_options.ImageHosting == "auto" && !PublicUrl.IsReachable(_options.EffectiveUploadsBaseUrl)));

    public bool NeedsRehost(string? imageUrl) => !string.IsNullOrWhiteSpace(imageUrl) && UseMetaHosting && !PublicUrl.IsReachable(imageUrl);

    /// <summary>Stores the finished image where Telegram, Facebook and Instagram can download it and returns that public URL.</summary>
    private async Task<string> PersistAsync(byte[] bytes, CancellationToken ct)
    {
        if (UseMetaHosting)
        {
            try { return await _meta!.HostImageAsync(bytes, ct); }
            catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                // Any failure (Graph error, non-JSON reply, network) falls back to this server's own /uploads.
                _logger.LogWarning(ex, "Could not host the share image through Meta ({Reason}); keeping it on this server.", ex.Message);
            }
        }

        await using var stream = new MemoryStream(bytes);
        var relative = await _storage.SaveAsync(stream, "share.jpg", "image/jpeg", "social");
        return relative.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? relative : _options.EffectiveUploadsBaseUrl.TrimEnd('/') + relative;
    }

    public async Task<string?> EnsureImageAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default)
    {
        LastError = null;
        if (NeedsRehost(job.ImageUrl)) job.ImageUrl = null;          // e.g. an old localhost link: build and host it again
        if (!string.IsNullOrWhiteSpace(job.ImageUrl)) return job.ImageUrl;

        // One picture per post and generation, shared by Telegram, Facebook and Instagram.
        var siblings = await _db.SocialShareJobs.AsNoTracking()
            .Where(j => j.Category == job.Category && j.EntityId == job.EntityId && j.Generation == job.Generation && j.ImageUrl != null)
            .Select(j => j.ImageUrl).ToListAsync(ct);
        var sibling = siblings.FirstOrDefault(u => !NeedsRehost(u));
        if (sibling is not null)
        {
            job.ImageUrl = sibling;
            await _db.SaveChangesAsync(ct);
            return sibling;
        }

        try
        {
            var bytes = await BuildBytesAsync(job, setting, ct);
            var url = await PersistAsync(bytes, ct);

            job.ImageUrl = url;
            await _db.SaveChangesAsync(ct);
            return url;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Could not build the share image for {Category} #{Id}.", job.Category, job.EntityId);
            LastError = $"{ex.GetType().Name}: {ex.Message}";
            return null;
        }
    }

    public async Task<string?> ApplyCustomHeroAsync(SocialShareJob job, SocialShareSetting setting, byte[] hero, CancellationToken ct = default)
    {
        try
        {
            var logo = await TryLoadLogoAsync(setting.LogoUrl, ct);
            var bytes = SocialImageComposer.Compose(new SocialImageRequest(
                job.Category, job.Title, SocialJobDetails.Read(job.DetailsJson), setting.ImageSize,
                setting.BrandColor, setting.AccentColor, hero, logo,
                SiteName: "JobCharcha", Domain: DomainOf(_options.PublicBaseUrl), Template: job.Template ?? 0));
            return await PersistAsync(bytes, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Could not build the share image from the supplied picture for {Category} #{Id}.", job.Category, job.EntityId);
            return null;
        }
    }

    public async Task<byte[]?> RenderPreviewAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default)
    {
        try { return await BuildBytesAsync(job, setting, ct); }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Could not render the share preview for {Category} #{Id}.", job.Category, job.EntityId);
            return null;
        }
    }

    private async Task<byte[]> BuildBytesAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct)
    {
        // Static JobCharcha poster: no AI picture. The hero strip is the theme's own sky and the watermark is the site logo.
        byte[]? background = null;
        var logo = await TryLoadLogoAsync(setting.LogoUrl, ct);

        var request = new SocialImageRequest(
            job.Category, job.Title, SocialJobDetails.Read(job.DetailsJson), setting.ImageSize,
            setting.BrandColor, setting.AccentColor, background, logo,
            SiteName: "JobCharcha", Domain: DomainOf(_options.PublicBaseUrl), Template: job.Template ?? 0);

        // A template the admin designed in Admin -> Auto-share -> Designer wins; if it cannot be drawn (no Chrome, bad HTML) the built-in poster is used.
        if (_posters?.CustomHtml(request.Template) is { } html)
        {
            try { return await _posters.RenderAsync(html, request, ct); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "HTML poster template {Slot} failed; using the built-in poster.", request.Template);
            }
        }
        return SocialImageComposer.Compose(request);
    }

    private async Task<byte[]?> TryLoadLogoAsync(string? logoUrl, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(logoUrl)) return null;
        try
        {
            var url = logoUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? logoUrl : _options.EffectiveUploadsBaseUrl.TrimEnd('/') + "/" + logoUrl.TrimStart('/');
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

    /// <summary>The address printed in the image footer. A dev machine's localhost address is replaced by the real site name.</summary>
    private static string DomainOf(string baseUrl) =>
        PublicUrl.IsReachable(baseUrl) && Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri) ? uri.Host : "jobcharcha.com";
}
