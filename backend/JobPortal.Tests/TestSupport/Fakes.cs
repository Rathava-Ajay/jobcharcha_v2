using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;

namespace JobPortal.Tests.TestSupport;

/// <summary>No-op audit sink for unit tests that construct a service directly. Records entries
/// in-memory so a test can assert on them when it cares; ignores them otherwise.</summary>
public class NoOpAuditService : IAuditService
{
    public List<AuditEntry> Entries { get; } = new();

    public Task LogAsync(AuditEntry entry, CancellationToken ct = default)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task<PagedResult<AuditEventDto>> QueryAsync(AuditQuery query) =>
        Task.FromResult(new PagedResult<AuditEventDto> { Page = 1, PageSize = query.PageSize });

    public Task<List<SignupSourceStatDto>> GetSignupSourceBreakdownAsync(DateTime? from, DateTime? to) =>
        Task.FromResult(new List<SignupSourceStatDto>());
}

public class FakeRazorpayClient : IRazorpayClient
{
    public string NextOrderId { get; set; } = "order_test123";
    public bool ThrowOnCreate { get; set; }

    public string NextRefundId { get; set; } = "rfnd_test123";
    public bool ThrowOnRefund { get; set; }

    public List<RazorpayPaymentStatusResult> OrderPayments { get; set; } = new();
    public bool ThrowOnFetchOrderPayments { get; set; }

    public Task<RazorpayOrderResult> CreateOrderAsync(long amountPaise, string currency, string receipt)
    {
        if (ThrowOnCreate) throw new InvalidOperationException("Simulated Razorpay outage.");
        return Task.FromResult(new RazorpayOrderResult
        {
            Id = NextOrderId,
            Amount = amountPaise,
            Currency = currency,
            Status = "created",
        });
    }

    public Task<RazorpayRefundResult> CreateRefundAsync(string razorpayPaymentId, long? amountPaise)
    {
        if (ThrowOnRefund) throw new InvalidOperationException("Simulated Razorpay refund outage.");
        return Task.FromResult(new RazorpayRefundResult
        {
            Id = NextRefundId,
            PaymentId = razorpayPaymentId,
            Amount = amountPaise ?? 0,
            Status = "processed",
        });
    }

    public Task<IReadOnlyList<RazorpayPaymentStatusResult>> FetchOrderPaymentsAsync(string razorpayOrderId)
    {
        if (ThrowOnFetchOrderPayments) throw new InvalidOperationException("Simulated Razorpay outage.");
        return Task.FromResult<IReadOnlyList<RazorpayPaymentStatusResult>>(OrderPayments);
    }

    public bool AuthOk { get; set; } = true;

    public Task<RazorpayAuthCheckResult> CheckAuthAsync() =>
        Task.FromResult(AuthOk
            ? new RazorpayAuthCheckResult { Ok = true, StatusCode = 200, Detail = "Authenticated" }
            : new RazorpayAuthCheckResult { Ok = false, StatusCode = 401, Detail = "Authentication failed (401)" });
}

/// <summary>Captures queued work items instead of running them — none of the current tests need the
/// background email actually sent, only that the request path itself doesn't depend on it.</summary>
public class FakeBackgroundTaskQueue : IBackgroundTaskQueue
{
    public int QueuedCount { get; private set; }

    public void QueueBackgroundWorkItem(Func<IServiceProvider, CancellationToken, Task> workItem) => QueuedCount++;

    public Task<Func<IServiceProvider, CancellationToken, Task>> DequeueAsync(CancellationToken cancellationToken) =>
        throw new NotSupportedException("Not needed by these tests.");
}
