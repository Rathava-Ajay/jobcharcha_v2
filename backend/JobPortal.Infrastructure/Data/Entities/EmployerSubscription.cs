using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EmployerProfileId", Name = "IX_EmployerSubscriptions_EmployerProfileId")]
[Index("EmployerProfileId", "IsActive", "EndDate", Name = "IX_EmployerSubscriptions_EmployerProfileId_IsActive_EndDate")]
public partial class EmployerSubscription
{
    [Key]
    public int Id { get; set; }

    public int EmployerProfileId { get; set; }

    public int? PlanId { get; set; }

    [StringLength(20)]
    public string? Status { get; set; }

    public DateTime? Notified7DayAt { get; set; }

    public DateTime? Notified1DayAt { get; set; }

    [StringLength(30)]
    public string PlanName { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Amount { get; set; }

    [StringLength(20)]
    public string BillingCycle { get; set; } = null!;

    public int MaxActiveJobs { get; set; }

    public int MaxFeaturedJobs { get; set; }

    public bool CanAccessResumes { get; set; }

    public int ResumeViewsPerMonth { get; set; }

    public int JobsPostedThisCycle { get; set; }

    public int ResumesViewedThisCycle { get; set; }

    public int FeaturedJobsUsedThisCycle { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public bool AutoRenew { get; set; }

    [StringLength(30)]
    public string PaymentMethod { get; set; } = null!;

    [StringLength(100)]
    public string? TransactionId { get; set; }

    [StringLength(100)]
    public string? RazorpayOrderId { get; set; }

    [StringLength(100)]
    public string? RazorpayPaymentId { get; set; }

    [StringLength(20)]
    public string PaymentStatus { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("EmployerProfileId")]
    [InverseProperty("EmployerSubscriptions")]
    public virtual EmployerProfile EmployerProfile { get; set; } = null!;

    [ForeignKey("PlanId")]
    [InverseProperty("EmployerSubscriptions")]
    public virtual EmployerPlan? Plan { get; set; }
}
