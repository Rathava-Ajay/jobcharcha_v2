using JobPortal.Application.Common;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <summary>Turns an HTML poster template plus a share's data points into the final JPEG (via headless Chrome).</summary>
public class SocialPosterService
{
    private static readonly Lazy<string> Watermark = new(() =>
    {
        var asm = typeof(SocialPosterService).Assembly;
        var name = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith("jobcharcha_watermark.png", StringComparison.OrdinalIgnoreCase));
        if (name is null) return "";
        using var s = asm.GetManifestResourceStream(name)!;
        using var ms = new MemoryStream();
        s.CopyTo(ms);
        return "data:image/png;base64," + Convert.ToBase64String(ms.ToArray());
    });

    private readonly PosterTemplateStore _store;
    private readonly IPosterRenderer _renderer;
    private readonly ILogger<SocialPosterService> _logger;

    public SocialPosterService(PosterTemplateStore store, IPosterRenderer renderer, ILogger<SocialPosterService> logger)
    {
        _store = store;
        _renderer = renderer;
        _logger = logger;
    }

    public string? BrowserPath => _renderer.BrowserPath;
    public PosterTemplateStore Store => _store;

    /// <summary>The admin's saved HTML for this template slot, or null (use the built-in poster).</summary>
    public string? CustomHtml(int slot) => _store.GetCustom(slot);

    public async Task<byte[]> RenderAsync(string html, SocialImageRequest request, CancellationToken ct = default)
    {
        var logoUri = request.Logo is { Length: > 0 } ? "data:image/png;base64," + Convert.ToBase64String(request.Logo) : null;
        var filled = SocialPosterHtml.Fill(html, SocialPosterHtml.Values(request, Watermark.Value, logoUri));
        return await _renderer.RenderAsync(filled, SocialImageComposer.Width, SocialImageComposer.HeightFor(request.Size), ct);
    }
}
