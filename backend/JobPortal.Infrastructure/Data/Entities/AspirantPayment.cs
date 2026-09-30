using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("PlanId", Name = "IX_AspirantPayments_PlanId")]
[Index("RazorpayOrderId", Name = "IX_AspirantPayments_RazorpayOrderId")]
[Index("TestId", Name = "IX_AspirantPayments_TestId")]
[Index("UserId", Name = "IX_AspirantPayments_UserId")]
public partial class AspirantPayment
{
    [Key]
    public int Id { get; set; }

    public string UserId { get; set; } = null!;

    [StringLength(30)]
    public string PaymentFor { get; set; } = null!;

    public int? PlanId { get; set; }

    public int? TestId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Amount { get; set; }

    [StringLength(5)]
    public string Currency { get; set; } = null!;

    [StringLength(20)]
    public string Status { get; set; } = null!;

    [StringLength(100)]
    public string? RazorpayOrderId { get; set; }

    [StringLength(100)]
    public string? RazorpayPaymentId { get; set; }

    [StringLength(200)]
    public string? RazorpaySignature { get; set; }

    [StringLength(50)]
    public string? InvoiceNumber { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? PaidAt { get; set; }

    [ForeignKey("PlanId")]
    [InverseProperty("AspirantPayments")]
    public virtual AspirantPlan? Plan { get; set; }

    [InverseProperty("AspirantPayment")]
    public virtual ICollection<PaymentLog> PaymentLogs { get; set; } = new List<PaymentLog>();

    [InverseProperty("Payment")]
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

    [ForeignKey("TestId")]
    [InverseProperty("AspirantPayments")]
    public virtual Test? Test { get; set; }

    [InverseProperty("Payment")]
    public virtual ICollection<TestPurchase> TestPurchases { get; set; } = new List<TestPurchase>();

    [ForeignKey("UserId")]
    [InverseProperty("AspirantPayments")]
    public virtual AspNetUser User { get; set; } = null!;
}
