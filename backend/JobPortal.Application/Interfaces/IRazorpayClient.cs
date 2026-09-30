namespace JobPortal.Application.Interfaces;

public class RazorpayOrderResult
{
    public string Id { get; set; } = null!;
    public long Amount { get; set; }
    public string Currency { get; set; } = null!;
    public string Status { get; set; } = null!;
}

public class RazorpayRefundResult
{
    public string Id { get; set; } = null!;
    public string PaymentId { get; set; } = null!;
    public long Amount { get; set; }
    /// <summary>"pending" or "processed".</summary>
    public string Status { get; set; } = null!;
}

public class RazorpayPaymentStatusResult
{
    public string Id { get; set; } = null!;
    public string OrderId { get; set; } = null!;
    /// <summary>"created" | "authorized" | "captured" | "refunded" | "failed".</summary>
    public string Status { get; set; } = null!;
    public long Amount { get; set; }
}

public class RazorpayAuthCheckResult
{
    /// <summary>True when the configured key id + secret authenticate against Razorpay's API.</summary>
    public bool Ok { get; set; }
    /// <summary>HTTP status code Razorpay returned to the probe request (0 if the call could not be made).</summary>
    public int StatusCode { get; set; }
    /// <summary>Short human-readable reason, e.g. "Authenticated" or "Authentication failed (401)".</summary>
    public string Detail { get; set; } = null!;
}

public interface IRazorpayClient
{
    /// <param name="amountPaise">Amount in the smallest currency unit (paise for INR).</param>
    Task<RazorpayOrderResult> CreateOrderAsync(long amountPaise, string currency, string receipt);

    /// <summary>
    /// Read-only probe (<c>GET /v1/payments?count=1</c>) that verifies the configured
    /// KeyId/KeySecret authenticate. No money moves, nothing is created — safe to call from an
    /// admin diagnostics screen to confirm a deploy's Razorpay config without taking a payment.
    /// </summary>
    Task<RazorpayAuthCheckResult> CheckAuthAsync();

    /// <param name="amountPaise">Null refunds the full captured amount.</param>
    Task<RazorpayRefundResult> CreateRefundAsync(string razorpayPaymentId, long? amountPaise);

    /// <summary>
    /// Server-to-server lookup of every payment attempt Razorpay recorded against an order —
    /// the reconciliation source of truth for orders where our own /verify callback never
    /// arrived (browser closed mid-flow, network drop, etc.), so there's no client-submitted
    /// signature to check here; the authenticated API call itself is the trust boundary.
    /// </summary>
    Task<IReadOnlyList<RazorpayPaymentStatusResult>> FetchOrderPaymentsAsync(string razorpayOrderId);
}
