using JobPortal.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <inheritdoc />
public class PrerenderSignal : IPrerenderSignal
{
    private readonly string? _flagPath;
    private readonly ILogger<PrerenderSignal> _logger;

    public PrerenderSignal(IConfiguration config, ILogger<PrerenderSignal> logger)
    {
        _flagPath = config["Prerender:FlagPath"];
        _logger = logger;
    }

    public void RequestRebuild(string reason)
    {
        if (string.IsNullOrWhiteSpace(_flagPath)) return; // not configured (dev / not deployed with prerender)
        try
        {
            var dir = Path.GetDirectoryName(_flagPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            // Content is informational only; the watch-timer keys off the file's existence + mtime.
            File.WriteAllText(_flagPath, $"{DateTime.UtcNow:O} {reason}\n");
        }
        catch (Exception ex)
        {
            // Never let a failed touch break the publish request itself.
            _logger.LogWarning(ex, "Could not write prerender flag file at {Path}", _flagPath);
        }
    }
}
