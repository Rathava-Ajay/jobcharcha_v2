using JobPortal.Application.Interfaces;

namespace JobPortal.Api;

/// <summary>
/// Hourly safety net for AspirantPayments stuck "Pending" — covers both the ordinary case (browser
/// closed mid-checkout before /verify ran) and the period during which Razorpay:WebhookSecret was
/// misconfigured, so real webhook deliveries were being rejected at the signature check. Reuses the
/// same GetStuckPendingPaymentsAsync/ResyncPaymentAsync pair already exposed to admins on
/// AdminPaymentsController — this just runs them on a timer instead of waiting for a manual click.
/// </summary>
public class PaymentReconciliationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PaymentReconciliationService> _logger;
    private const int StuckAfterMinutes = 30;

    public PaymentReconciliationService(IServiceProvider serviceProvider, ILogger<PaymentReconciliationService> logger)
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
                var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();

                var stuck = await paymentService.GetStuckPendingPaymentsAsync(StuckAfterMinutes);
                foreach (var payment in stuck)
                {
                    var result = await paymentService.ResyncPaymentAsync(payment.PaymentId);
                    if (!result.Succeeded)
                    {
                        _logger.LogWarning(
                            "Payment reconciliation could not resync payment {PaymentId}: {ErrorCode} {Error}",
                            payment.PaymentId, result.ErrorCode, result.Error);
                    }
                }

                if (stuck.Count > 0)
                {
                    _logger.LogInformation("Payment reconciliation swept {Count} stuck pending payment(s).", stuck.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Payment reconciliation sweep failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
