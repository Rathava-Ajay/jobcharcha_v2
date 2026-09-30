using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CreatedDate", Name = "IX_PaymentLogs_CreatedDate")]
[Index("Event", Name = "IX_PaymentLogs_Event")]
[Index("OrderId", Name = "IX_PaymentLogs_OrderId")]
[Index("AspirantPaymentId", Name = "IX_PaymentLogs_AspirantPaymentId")]
[Index("RazorpayOrderId", Name = "IX_PaymentLogs_RazorpayOrderId")]
[Index("RazorpayPaymentId", Name = "IX_PaymentLogs_RazorpayPaymentId")]
[Index("Status", Name = "IX_PaymentLogs_Status")]
[Index("RazorpayEventId", Name = "IX_PaymentLogs_RazorpayEventId")]
public partial class PaymentLog
{
    [Key]
    public int LogId { get; set; }

    public int? OrderId { get; set; }

    public int? AspirantPaymentId { get; set; }

    [StringLength(100)]
    public string? RazorpayOrderId { get; set; }

    [StringLength(100)]
    public string? RazorpayPaymentId { get; set; }

    /// <summary>
    /// Razorpay's webhook body carries no canonical event id and sends no
    /// X-Razorpay-Event-Id header, so this is a synthesized "{event}:{order/payment id}:{created_at}"
    /// key for audit/dedup visibility only — the actual idempotency guarantee for order-status
    /// mutations comes from the AspirantPayment.Status == "Pending" guard, not from this field.
    /// </summary>
    [StringLength(200)]
    public string? RazorpayEventId { get; set; }

    [StringLength(50)]
    public string Event { get; set; } = null!;

    [StringLength(50)]
    public string? Status { get; set; }

    public long? Amount { get; set; }

    [StringLength(10)]
    public string? Currency { get; set; }

    public string? EventData { get; set; }

    public bool IsSuccess { get; set; }

    [StringLength(1000)]
    public string? ErrorMessage { get; set; }

    [Column("IPAddress")]
    [StringLength(50)]
    public string? Ipaddress { get; set; }

    [StringLength(500)]
    public string? UserAgent { get; set; }

    [StringLength(50)]
    public string? PaymentMethod { get; set; }

    public DateTime CreatedDate { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("PaymentLogs")]
    public virtual Order? Order { get; set; }

    [ForeignKey("AspirantPaymentId")]
    [InverseProperty("PaymentLogs")]
    public virtual AspirantPayment? AspirantPayment { get; set; }
}
