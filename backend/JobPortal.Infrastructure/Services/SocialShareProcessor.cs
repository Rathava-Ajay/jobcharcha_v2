using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <summary>The engine behind auto-share. Each pass of <see cref="RunOnceAsync"/>:
/// 1) puts shares stuck mid-attempt (crash/restart) back in the queue,
/// 2) builds the image + message preview for shares waiting for admin approval,
/// 3) posts every due share — one channel at a time, so a failure on one channel never blocks another.
/// Failures are retried with exponential backoff up to <see cref="SocialShareOptions.MaxAttempts"/> times.</summary>
public class SocialShareProcessor
{
    private static readonly TimeSpan StuckAfter = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan MaxBackoff = TimeSpan.FromHours(1);

    private readonly AppDbContext _db;
    private readonly IReadOnlyDictionary<string, ISocialChannel> _channels;
    private readonly ISocialImageService _images;
    private readonly SocialShareOptions _options;
    private readonly TimeProvider _clock;
    private readonly ILogger<SocialShareProcessor> _logger;

    public SocialShareProcessor(AppDbContext db, IEnumerable<ISocialChannel> channels, ISocialImageService images,
        SocialShareOptions options, TimeProvider clock, ILogger<SocialShareProcessor> logger)
    {
        _db = db;
        _channels = channels.ToDictionary(c => c.Channel);
        _images = images;
        _options = options;
        _clock = clock;
        _logger = logger;
    }

    /// <summary>Delay before attempt number <paramref name="attemptsSoFar"/> + 1: base, 2x, 4x, ... capped at one hour.</summary>
    public static TimeSpan Backoff(int attemptsSoFar, int baseSeconds)
    {
        var seconds = baseSeconds * Math.Pow(2, Math.Max(0, attemptsSoFar - 1));
        var delay = TimeSpan.FromSeconds(Math.Min(seconds, MaxBackoff.TotalSeconds));
        return delay;
    }

    /// <summary>Returns how many shares were posted or attempted in this pass.</summary>
    public async Task<int> RunOnceAsync(CancellationToken ct = default, int batchSize = 10)
    {
        var now = _clock.GetUtcNow().UtcDateTime;
        var handled = 0;

        var stuck = await _db.SocialShareJobs
            .Where(j => j.Status == SocialShareStatus.Processing && j.UpdatedDate < now - StuckAfter)
            .ToListAsync(ct);
        foreach (var job in stuck)
        {
            job.Status = SocialShareStatus.Pending;
            job.NextAttemptAt = now;
            job.Error = "Recovered after an interrupted attempt.";
            job.UpdatedDate = now;
        }
        if (stuck.Count > 0) await _db.SaveChangesAsync(ct);

        var toPrepare = await _db.SocialShareJobs
            .Where(j => j.Status == SocialShareStatus.AwaitingApproval && j.Message == null)
            .OrderBy(j => j.Id).Take(batchSize).ToListAsync(ct);
        foreach (var job in toPrepare)
        {
            if (!_options.IsConfigured(job.Channel)) continue;
            await PrepareAsync(job, ct);
            handled++;
        }

        var due = await _db.SocialShareJobs
            .Where(j => j.Status == SocialShareStatus.Pending && j.NextAttemptAt != null && j.NextAttemptAt <= now)
            .OrderBy(j => j.NextAttemptAt).Take(batchSize).ToListAsync(ct);
        foreach (var job in due)
        {
            ct.ThrowIfCancellationRequested();
            // A channel without credentials on THIS server (e.g. a dev machine pointed at the shared database) must not
            // touch the share — it stays queued for a server that can actually post it.
            if (!_options.IsConfigured(job.Channel) || !_channels.ContainsKey(job.Channel)) continue;
            await ProcessAsync(job, ct);
            handled++;
        }
        return handled;
    }

    /// <summary>Generates the image and the exact message that will be posted, without posting anything.</summary>
    private async Task PrepareAsync(SocialShareJob job, CancellationToken ct)
    {
        var setting = await LoadSettingAsync(job.Category, ct);
        await _images.EnsureImageAsync(job, setting, ct);      // null => the channel falls back (Telegram text-only, Facebook link post)
        job.Message = SocialMessages.Build(job.Channel, job, setting);
        job.UpdatedDate = _clock.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(ct);
    }

    private async Task ProcessAsync(SocialShareJob job, CancellationToken ct)
    {
        var now = _clock.GetUtcNow().UtcDateTime;

        // Idempotency: never post twice to the same channel for the same share.
        if (!string.IsNullOrEmpty(job.ExternalId))
        {
            job.Status = SocialShareStatus.Posted;
            job.PostedAt ??= now;
            job.NextAttemptAt = null;
            job.UpdatedDate = now;
            await _db.SaveChangesAsync(ct);
            return;
        }

        job.Status = SocialShareStatus.Processing;
        job.UpdatedDate = now;
        await _db.SaveChangesAsync(ct);

        try
        {
            var setting = await LoadSettingAsync(job.Category, ct);
            if (string.IsNullOrWhiteSpace(job.Message))
            {
                await _images.EnsureImageAsync(job, setting, ct);
                job.Message = SocialMessages.Build(job.Channel, job, setting);
            }

            var externalId = await _channels[job.Channel].PostAsync(job, setting, ct);

            job.ExternalId = externalId.Length > 100 ? externalId[..100] : externalId;
            job.Status = SocialShareStatus.Posted;
            job.PostedAt = _clock.GetUtcNow().UtcDateTime;
            job.NextAttemptAt = null;
            job.Error = null;
            job.Attempts++;
            job.UpdatedDate = job.PostedAt.Value;
            // Saved straight away: the id is what stops a retry from posting this share twice.
            await _db.SaveChangesAsync(CancellationToken.None);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Shutting down mid-attempt: leave it Processing; the stuck-recovery pass requeues it.
            throw;
        }
        catch (Exception ex)
        {
            await RecordFailureAsync(job, ex);
        }
    }

    private async Task RecordFailureAsync(SocialShareJob job, Exception ex)
    {
        var now = _clock.GetUtcNow().UtcDateTime;
        job.Attempts++;
        job.UpdatedDate = now;

        var known = ex as SocialShareException;
        var retryable = known?.Retryable ?? true;               // unexpected errors get the benefit of the doubt
        var message = known?.Message ?? $"{ex.GetType().Name}: {ex.Message}";
        job.Error = message.Length > 1000 ? message[..1000] : message;

        if (retryable && job.Attempts < _options.MaxAttempts)
        {
            var delay = Backoff(job.Attempts, _options.BaseBackoffSeconds);
            if (known?.RetryAfter is { } serverWait && serverWait > delay) delay = serverWait;
            job.Status = SocialShareStatus.Pending;
            job.NextAttemptAt = now + delay;
            _logger.LogWarning("Share #{Id} ({Channel}) failed attempt {Attempt}; retrying in {Delay}: {Error}", job.Id, job.Channel, job.Attempts, delay, job.Error);
        }
        else
        {
            job.Status = SocialShareStatus.Failed;
            job.NextAttemptAt = null;
            _logger.LogError("Share #{Id} ({Channel}) failed permanently after {Attempts} attempt(s): {Error}", job.Id, job.Channel, job.Attempts, job.Error);
        }
        await _db.SaveChangesAsync(CancellationToken.None);
    }

    private async Task<SocialShareSetting> LoadSettingAsync(string category, CancellationToken ct) =>
        await _db.SocialShareSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Category == category, ct)
        ?? SocialShareService.DefaultSetting(category);
}
