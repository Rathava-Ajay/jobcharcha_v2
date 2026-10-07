using JobPortal.Application.Common;
using JobPortal.Infrastructure.Services;

namespace JobPortal.Api;

/// <summary>Polls the SocialShareJobs table and hands due shares to <see cref="SocialShareProcessor"/>. Because the
/// queue is the database, pending shares and retry timers survive an API restart. Same shape as the other sweeps.</summary>
public class SocialShareWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(15);

    private readonly IServiceProvider _services;
    private readonly SocialShareOptions _options;
    private readonly ILogger<SocialShareWorker> _logger;

    public SocialShareWorker(IServiceProvider services, SocialShareOptions options, ILogger<SocialShareWorker> logger)
    {
        _services = services;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.WorkerEnabled)
        {
            _logger.LogInformation("Social share worker is disabled (SocialShare:WorkerEnabled=false).");
            return;
        }

        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                int handled;
                do
                {
                    using var scope = _services.CreateScope();
                    handled = await scope.ServiceProvider.GetRequiredService<SocialShareProcessor>().RunOnceAsync(stoppingToken);
                } while (handled > 0 && !stoppingToken.IsCancellationRequested);   // drain a backlog before sleeping
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Social share pass failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
