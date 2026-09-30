using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EmployerPlanId", Name = "IX_EmployerPayments_EmployerPlanId")]
[Index("EmployerProfileId", Name = "IX_EmployerPayments_EmployerProfileId")]
[Index("RazorpayOrderId", Name = "IX_EmployerPayments_RazorpayOrderId")]
public partial class EmployerPayment
{
    [Key]
    public int Id { get; set; }

    public int EmployerProfileId { get; set; }

    public int EmployerPlanId { get; set; }

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

    public DateTime CreatedDate { get; set; }

    public DateTime? PaidAt { get; set; }

    [ForeignKey("EmployerProfileId")]
    [InverseProperty("EmployerPayments")]
    public virtual EmployerProfile EmployerProfile { get; set; } = null!;

    [ForeignKey("EmployerPlanId")]
    [InverseProperty("EmployerPayments")]
    public virtual EmployerPlan Plan { get; set; } = null!;
}
