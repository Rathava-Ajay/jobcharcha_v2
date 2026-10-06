using System.Diagnostics;
using JobPortal.Application.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkiaSharp;

namespace JobPortal.Infrastructure.Services;

public interface IPosterRenderer
{
    /// <summary>Path of the Chrome / Chromium / Edge used to draw HTML posters, or null when none is installed.</summary>
    string? BrowserPath { get; }

    /// <summary>Draws a finished HTML page as a JPEG of exactly <paramref name="width"/> x <paramref name="height"/>.</summary>
    Task<byte[]> RenderAsync(string html, int width, int height, CancellationToken ct = default);
}

/// <summary>Draws HTML poster templates with the machine's own headless Chrome / Chromium (no extra NuGet package): it is started once per
/// image (templates cannot contain scripts: they are rejected on save), screenshots the page and exits. On Ubuntu install it with
/// <c>apt install chromium-browser fonts-noto-core</c> (or Google Chrome); set <c>SocialShare:ChromePath</c> to use a specific binary.</summary>
public class HeadlessPosterRenderer : IPosterRenderer
{
    private static readonly string[] Names = { "google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "chrome" };
    private static readonly string[] Fixed =
    {
        "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium",
        @"C:\Program Files\Google\Chrome\Application\chrome.exe", @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    };

    private static readonly SemaphoreSlim OneAtATime = new(2);     // two Chromes at once is plenty for a share queue

    private readonly Lazy<string?> _path;
    private readonly ILogger<HeadlessPosterRenderer> _logger;

    public HeadlessPosterRenderer(IConfiguration config, ILogger<HeadlessPosterRenderer> logger)
    {
        _logger = logger;
        _path = new Lazy<string?>(() => Find(config["SocialShare:ChromePath"]));
    }

    public string? BrowserPath => _path.Value;

    private static string? Find(string? configured)
    {
        if (!string.IsNullOrWhiteSpace(configured) && File.Exists(configured.Trim())) return configured.Trim();
        foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
            foreach (var name in Names)
                foreach (var candidate in new[] { Path.Combine(dir, name), Path.Combine(dir, name + ".exe") })
                    if (File.Exists(candidate)) return candidate;
        return Fixed.FirstOrDefault(File.Exists);
    }

    public async Task<byte[]> RenderAsync(string html, int width, int height, CancellationToken ct = default)
    {
        var chrome = BrowserPath ?? throw new SocialShareException(
            "No Chrome/Chromium is installed on this server, so HTML poster templates cannot be drawn. On Ubuntu: sudo apt install -y chromium-browser fonts-noto-core " +
            "(or set SocialShare:ChromePath).", retryable: false);

        var work = Path.Combine(Path.GetTempPath(), "poster-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(work);
        try
        {
            var page = Path.Combine(work, "poster.html");
            var shot = Path.Combine(work, "poster.png");
            await File.WriteAllTextAsync(page, html, new System.Text.UTF8Encoding(false), ct);

            await OneAtATime.WaitAsync(ct);
            try
            {
                var psi = new ProcessStartInfo(chrome)
                {
                    RedirectStandardError = true, RedirectStandardOutput = true, UseShellExecute = false, CreateNoWindow = true,
                };
                foreach (var a in new[]
                {
                    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--disable-extensions", "--no-first-run", "--disable-background-networking",
                    $"--user-data-dir={Path.Combine(work, "profile")}", $"--window-size={width},{height}", $"--screenshot={shot}",
                    "--virtual-time-budget=4000", new Uri(page).AbsoluteUri,
                }) psi.ArgumentList.Add(a);

                using var proc = Process.Start(psi) ?? throw new SocialShareException("Could not start Chrome.", retryable: true);
                var errTask = proc.StandardError.ReadToEndAsync(ct);
                _ = proc.StandardOutput.ReadToEndAsync(ct);
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeout.CancelAfter(TimeSpan.FromSeconds(40));
                try { await proc.WaitForExitAsync(timeout.Token); }
                catch (OperationCanceledException) when (!ct.IsCancellationRequested)
                {
                    try { proc.Kill(entireProcessTree: true); } catch { /* already gone */ }
                    throw new SocialShareException("Chrome took too long to draw the poster.", retryable: true);
                }

                if (!File.Exists(shot))
                {
                    var err = await errTask;
                    _logger.LogWarning("Chrome produced no screenshot (exit {Code}): {Err}", proc.ExitCode, err.Length > 600 ? err[..600] : err);
                    throw new SocialShareException($"Chrome could not draw the poster (exit code {proc.ExitCode}).", retryable: true);
                }
            }
            finally { OneAtATime.Release(); }

            using var bmp = SKBitmap.Decode(shot) ?? throw new SocialShareException("Chrome produced an unreadable image.", retryable: true);
            using var canvas = new SKBitmap(width, height);
            using (var c = new SKCanvas(canvas))
            {
                c.Clear(SKColors.White);
                c.DrawBitmap(bmp, 0, 0);                    // headless windows can come out a few px off: pin to the exact size
            }
            using var image = SKImage.FromBitmap(canvas);
            using var data = image.Encode(SKEncodedImageFormat.Jpeg, 90);
            return data.ToArray();
        }
        finally
        {
            try { Directory.Delete(work, true); } catch { /* temp folder, best effort */ }
        }
    }
}
