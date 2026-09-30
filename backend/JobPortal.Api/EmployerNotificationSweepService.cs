using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Services;

namespace JobPortal.Api;

/// <summary>
/// First recurring/cron-style job in this codebase — everything else is fire-and-forget via
/// IBackgroundTaskQueue. Ticks hourly: flips expired EmployerSubscriptions, and sends 7-day/1-day
/// expiry and low-credit email warnings (deduped via Notified7DayAt/Notified1DayAt/LowCreditNotifiedAt).
/// </summary>
public class EmployerNotificationSweepService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EmployerNotificationSweepService> _logger;

    public EmployerNotificationSweepService(IServiceProvider serviceProvider, ILogger<EmployerNotificationSweepService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));

        do
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
                await EmployerBillingService.RunNotificationSweepAsync(db, emailSender, _logger);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Employer notification sweep failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
