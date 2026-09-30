using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EmployerProfileId", Name = "IX_EmployerJobs_EmployerProfileId")]
[Index("IsFeatured", "FeaturedUntil", Name = "IX_EmployerJobs_IsFeatured_FeaturedUntil")]
[Index("Slug", Name = "IX_EmployerJobs_Slug", IsUnique = true)]
[Index("Status", "IsActive", Name = "IX_EmployerJobs_Status_IsActive")]
[Index("DuplicateFingerprint", Name = "IX_EmployerJobs_DuplicateFingerprint")]
public partial class EmployerJob
{
    [Key]
    public int Id { get; set; }

    public int EmployerProfileId { get; set; }

    [StringLength(300)]
    public string Title { get; set; } = null!;

    [StringLength(320)]
    public string Slug { get; set; } = null!;

    [StringLength(100)]
    public string? Department { get; set; }

    [StringLength(20)]
    public string JobType { get; set; } = null!;

    [StringLength(20)]
    public string WorkMode { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string? Requirements { get; set; }

    public string? Benefits { get; set; }

    [StringLength(500)]
    public string? Skills { get; set; }

    [StringLength(200)]
    public string Qualification { get; set; } = null!;

    [StringLength(20)]
    public string? ExperienceRequired { get; set; }

    [StringLength(50)]
    public string? SalaryMin { get; set; }

    [StringLength(50)]
    public string? SalaryMax { get; set; }

    public bool IsSalaryNegotiable { get; set; }

    public bool HideSalary { get; set; }

    [StringLength(100)]
    public string City { get; set; } = null!;

    [StringLength(50)]
    public string State { get; set; } = null!;

    public int? Openings { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsUrgent { get; set; }

    [StringLength(30)]
    public string? FeaturedBadge { get; set; }

    public DateTime? FeaturedUntil { get; set; }

    public DateTime? LastDate { get; set; }

    /// <summary>Optional employer-uploaded job-details file (PDF or image) — served from
    /// <c>/uploads/employer-jobs/…</c>. Shown as a download on the public posting.</summary>
    [StringLength(500)]
    public string? AttachmentUrl { get; set; }

    [StringLength(260)]
    public string? AttachmentName { get; set; }

    [StringLength(300)]
    public string? MetaTitle { get; set; }

    [StringLength(500)]
    public string? MetaDescription { get; set; }

    public int ViewCount { get; set; }

    public int ApplicationCount { get; set; }

    /// <summary>One of <see cref="EmployerJobStatuses"/>: PendingReview, Active, Rejected, Closed.</summary>
    [StringLength(20)]
    public string Status { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    /// <summary>Set when an admin approves a PendingReview posting. Its presence on ANY of an
    /// employer's postings is what marks that employer "trusted" — their later posts auto-publish.
    /// Left null for auto-published postings (trusted employer) — only admin approvals count.</summary>
    public DateTime? ApprovedAt { get; set; }

    [StringLength(450)]
    public string? ApprovedByUserId { get; set; }

    [StringLength(500)]
    public string? RejectionReason { get; set; }

    /// <summary>Normalized "title|company|city" — used to reject an employer re-posting a listing
    /// that duplicates one they already have live. Mirrors <c>JobService.BuildFingerprint</c>.</summary>
    [StringLength(600)]
    public string? DuplicateFingerprint { get; set; }

    [ForeignKey("EmployerProfileId")]
    [InverseProperty("EmployerJobs")]
    public virtual EmployerProfile EmployerProfile { get; set; } = null!;

    [InverseProperty("EmployerJob")]
    public virtual ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}
