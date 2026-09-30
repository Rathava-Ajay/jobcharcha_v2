using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Payments;

public class CreateOrderRequest
{
    /// <summary>"Plan", "Test", or "WalletTopUp".</summary>
    [Required]
    [RegularExpression("^(?i:Plan|Test|WalletTopUp)$", ErrorMessage = "paymentFor must be 'Plan', 'Test', or 'WalletTopUp'.")]
    public string PaymentFor { get; set; } = null!;

    [Range(1, int.MaxValue)]
    public int? PlanId { get; set; }

    [Range(1, int.MaxValue)]
    public int? TestId { get; set; }

    /// <summary>Required only when PaymentFor == "WalletTopUp" — the INR amount to add to the wallet.
    /// Capped so a malformed or hostile client can't create an absurd order.</summary>
    [Range(1, 100000, ErrorMessage = "Wallet top-up amount must be between ₹1 and ₹1,00,000.")]
    public decimal? Amount { get; set; }
}

public class CreateOrderResponse
{
    public int PaymentId { get; set; }
    public string RazorpayOrderId { get; set; } = null!;
    public long Amount { get; set; }
    public string Currency { get; set; } = null!;
    public string KeyId { get; set; } = null!;
}

public class VerifyPaymentRequest
{
    [Required, StringLength(80)]
    public string RazorpayOrderId { get; set; } = null!;

    [Required, StringLength(80)]
    public string RazorpayPaymentId { get; set; } = null!;

    [Required, StringLength(256)]
    public string RazorpaySignature { get; set; } = null!;
}

public class VerifyPaymentResponse
{
    public bool Unlocked { get; set; }
    public string? PaymentFor { get; set; }
    public int? TestId { get; set; }
}

public class PaymentHistoryItemDto
{
    public int Id { get; set; }
    public string PaymentFor { get; set; } = null!;
    public string? PlanName { get; set; }
    public string? TestTitle { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? RazorpayPaymentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class ActiveSubscriptionDto
{
    public string PlanName { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
}

public class PaymentHistoryDto
{
    public List<PaymentHistoryItemDto> Payments { get; set; } = new();
    public ActiveSubscriptionDto? ActiveSubscription { get; set; }
}

public class RefundPaymentRequest
{
    [StringLength(500)]
    public string? Reason { get; set; }
}

public class RefundPaymentResponse
{
    public int PaymentId { get; set; }
    public string RazorpayRefundId { get; set; } = null!;
    public string Status { get; set; } = null!;
    public bool AccessRevoked { get; set; }
}

/// <summary>A "Pending" payment old enough that the user's /verify callback plausibly never
/// arrived — the set an admin needs to look at and, if Razorpay shows it was actually paid,
/// resolve with <see cref="ResyncPaymentResponse"/>.</summary>
public class StuckPaymentDto
{
    public int PaymentId { get; set; }
    public string UserId { get; set; } = null!;
    public string PaymentFor { get; set; } = null!;
    public decimal Amount { get; set; }
    public string? RazorpayOrderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public int MinutesPending { get; set; }
}

public class ResyncPaymentResponse
{
    public int PaymentId { get; set; }
    /// <summary>"Paid" | "Failed" | "StillPending" — the status after reconciling against Razorpay's records.</summary>
    public string ResolvedStatus { get; set; } = null!;
    public string? RazorpayPaymentId { get; set; }
}

public class DisputeDto
{
    public int Id { get; set; }
    public string RazorpayDisputeId { get; set; } = null!;
    public string RazorpayPaymentId { get; set; } = null!;
    public long Amount { get; set; }
    public long AmountDeducted { get; set; }
    public string Currency { get; set; } = null!;
    public string? ReasonCode { get; set; }
    public string Status { get; set; } = null!;
    public string? Phase { get; set; }
    public DateTime? RespondBy { get; set; }
    public int? AspirantPaymentId { get; set; }
    public int? OrderId { get; set; }
    public string LastEventName { get; set; } = null!;
    public DateTime CreatedDate { get; set; }
    public DateTime UpdatedDate { get; set; }
}

/// <summary>Admin diagnostics for the Razorpay integration — surfaced on the Payments admin panel
/// so a misconfigured deploy (blank/wrong keys) is visible without having to take a real payment.</summary>
public class RazorpayHealthDto
{
    /// <summary>The live auth probe result (read-only GET against Razorpay's API).</summary>
    public bool Authenticated { get; set; }
    public int ProbeStatusCode { get; set; }
    public string Detail { get; set; } = null!;

    /// <summary>Config presence — never returns the secret values themselves.</summary>
    public bool KeyIdConfigured { get; set; }
    public string? KeyIdMasked { get; set; }
    public bool KeySecretConfigured { get; set; }
    public bool WebhookSecretConfigured { get; set; }
    /// <summary>True when WebhookSecret == KeySecret — a known misconfiguration that rejects every webhook.</summary>
    public bool WebhookSecretEqualsKeySecret { get; set; }
}
