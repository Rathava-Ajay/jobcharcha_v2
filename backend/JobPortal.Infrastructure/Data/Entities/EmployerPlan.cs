using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("IsActive", Name = "IX_EmployerPlans_IsActive")]
[Index("IsTopUp", Name = "IX_EmployerPlans_IsTopUp")]
public partial class EmployerPlan
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(500)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    public int DurationDays { get; set; }

    public bool IsTopUp { get; set; }

    public int IncludedCredits { get; set; }

    public bool IsUnlimitedCredits { get; set; }

    public int MaxActiveJobs { get; set; }

    public int MaxFeaturedJobs { get; set; }

    public bool CanAccessResumes { get; set; }

    public int ResumeViewsPerMonth { get; set; }

    public int DisplayOrder { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [InverseProperty("Plan")]
    public virtual ICollection<EmployerPayment> EmployerPayments { get; set; } = new List<EmployerPayment>();

    [InverseProperty("Plan")]
    public virtual ICollection<EmployerSubscription> EmployerSubscriptions { get; set; } = new List<EmployerSubscription>();
}
