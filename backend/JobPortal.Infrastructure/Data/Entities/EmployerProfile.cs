using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CompanySlug", Name = "IX_EmployerProfiles_CompanySlug", IsUnique = true)]
[Index("IsVerified", Name = "IX_EmployerProfiles_IsVerified")]
[Index("UserId", Name = "IX_EmployerProfiles_UserId", IsUnique = true)]
public partial class EmployerProfile
{
    [Key]
    public int Id { get; set; }

    public string UserId { get; set; } = null!;

    [StringLength(200)]
    public string CompanyName { get; set; } = null!;

    [StringLength(220)]
    public string CompanySlug { get; set; } = null!;

    [StringLength(500)]
    public string? LogoUrl { get; set; }

    [StringLength(300)]
    public string? Website { get; set; }

    public string? Description { get; set; }

    [StringLength(100)]
    public string? Industry { get; set; }

    [StringLength(20)]
    public string CompanySize { get; set; } = null!;

    [StringLength(100)]
    public string City { get; set; } = null!;

    [StringLength(50)]
    public string State { get; set; } = null!;

    [StringLength(150)]
    public string ContactName { get; set; } = null!;

    [StringLength(200)]
    public string ContactEmail { get; set; } = null!;

    [StringLength(20)]
    public string ContactPhone { get; set; } = null!;

    [StringLength(20)]
    public string? WhatsAppNumber { get; set; }

    [Column("GSTNumber")]
    [StringLength(20)]
    public string? Gstnumber { get; set; }

    [Column("PANNumber")]
    [StringLength(20)]
    public string? Pannumber { get; set; }

    public bool IsVerified { get; set; }

    public DateTime? VerifiedAt { get; set; }

    [StringLength(450)]
    public string? VerifiedBy { get; set; }

    public bool IsAgency { get; set; }

    public int TotalJobsPosted { get; set; }

    public int TotalApplicationsReceived { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [InverseProperty("EmployerProfile")]
    public virtual ICollection<EmployerAcknowledgment> EmployerAcknowledgments { get; set; } = new List<EmployerAcknowledgment>();

    [InverseProperty("EmployerProfile")]
    public virtual EmployerCredits? EmployerCredits { get; set; }

    [InverseProperty("EmployerProfile")]
    public virtual ICollection<EmployerContactLog> EmployerContactLogs { get; set; } = new List<EmployerContactLog>();

    [InverseProperty("EmployerProfile")]
    public virtual ICollection<EmployerJob> EmployerJobs { get; set; } = new List<EmployerJob>();

    [InverseProperty("EmployerProfile")]
    public virtual ICollection<EmployerPayment> EmployerPayments { get; set; } = new List<EmployerPayment>();

    [InverseProperty("EmployerProfile")]
    public virtual ICollection<EmployerSubscription> EmployerSubscriptions { get; set; } = new List<EmployerSubscription>();

    [InverseProperty("EmployerProfile")]
    public virtual ICollection<CreditTransaction> CreditTransactions { get; set; } = new List<CreditTransaction>();

    [ForeignKey("UserId")]
    [InverseProperty("EmployerProfile")]
    public virtual AspNetUser User { get; set; } = null!;
}
