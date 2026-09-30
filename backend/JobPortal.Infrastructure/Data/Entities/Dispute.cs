using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>
/// A Razorpay chargeback/dispute, populated entirely from payment.dispute.* webhooks
/// (created/under_review/action_required/won/lost/closed all update the same row by
/// RazorpayDisputeId — Razorpay resends the full dispute entity on every phase change).
/// </summary>
[Index("RazorpayDisputeId", Name = "IX_Disputes_RazorpayDisputeId", IsUnique = true)]
[Index("RazorpayPaymentId", Name = "IX_Disputes_RazorpayPaymentId")]
[Index("Status", Name = "IX_Disputes_Status")]
public partial class Dispute
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string RazorpayDisputeId { get; set; } = null!;

    [StringLength(100)]
    public string RazorpayPaymentId { get; set; } = null!;

    /// <summary>Paise, as Razorpay reports it.</summary>
    public long Amount { get; set; }

    public long AmountDeducted { get; set; }

    [StringLength(3)]
    public string Currency { get; set; } = null!;

    [StringLength(100)]
    public string? ReasonCode { get; set; }

    /// <summary>"open" | "under_review" | "won" | "lost" | "closed" — whatever Razorpay's latest webhook reported.</summary>
    [StringLength(30)]
    public string Status { get; set; } = null!;

    /// <summary>"chargeback" | "pre_arbitration" | "arbitration" (Razorpay's dispute phase).</summary>
    [StringLength(30)]
    public string? Phase { get; set; }

    /// <summary>Deadline for the merchant to submit evidence, from Razorpay's respond_by (unix seconds).</summary>
    public DateTime? RespondBy { get; set; }

    /// <summary>Best-effort link back to whichever local record this payment belongs to — a dispute
    /// can be raised against either payment rail, so at most one of these two is set.</summary>
    public int? AspirantPaymentId { get; set; }

    public int? OrderId { get; set; }

    /// <summary>The most recent payment.dispute.* event name received for this dispute.</summary>
    [StringLength(50)]
    public string LastEventName { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime UpdatedDate { get; set; }

    [ForeignKey("AspirantPaymentId")]
    public virtual AspirantPayment? AspirantPayment { get; set; }

    [ForeignKey("OrderId")]
    public virtual Order? Order { get; set; }
}
