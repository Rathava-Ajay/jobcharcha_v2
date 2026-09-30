using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ExpiresAt", Name = "IX_Subscriptions_ExpiresAt")]
[Index("PaymentId", Name = "IX_Subscriptions_PaymentId")]
[Index("PlanId", Name = "IX_Subscriptions_PlanId")]
[Index("UserId", "Status", Name = "IX_Subscriptions_UserId_Status")]
public partial class Subscription
{
    [Key]
    public int Id { get; set; }

    public string UserId { get; set; } = null!;

    public int PlanId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    public DateTime StartsAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    [StringLength(20)]
    public string Status { get; set; } = null!;

    public int? PaymentId { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("PaymentId")]
    [InverseProperty("Subscriptions")]
    public virtual AspirantPayment? Payment { get; set; }

    [ForeignKey("PlanId")]
    [InverseProperty("Subscriptions")]
    public virtual AspirantPlan Plan { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("Subscriptions")]
    public virtual AspNetUser User { get; set; } = null!;
}
