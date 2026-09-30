using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_Jobs_CategoryId")]
[Index("CategoryId", "IsActive", "PostedDate", Name = "IX_Jobs_CategoryId_IsActive_PostedDate")]
[Index("CreatedById", Name = "IX_Jobs_CreatedById")]
[Index("DuplicateFingerprint", Name = "IX_Jobs_DuplicateFingerprint", IsUnique = true)]
[Index("IsActive", Name = "IX_Jobs_IsActive")]
[Index("IsActive", "LastDate", Name = "IX_Jobs_IsActive_LastDate")]
[Index("IsActive", "Status", "LastDate", Name = "IX_Jobs_IsActive_Status_LastDate")]
[Index("IsFeatured", Name = "IX_Jobs_IsFeatured")]
[Index("IsFeatured", "IsActive", "PostedDate", Name = "IX_Jobs_IsFeatured_IsActive_PostedDate")]
[Index("IsUrgent", "IsActive", "Status", Name = "IX_Jobs_IsUrgent_IsActive_Status")]
[Index("LastDate", Name = "IX_Jobs_LastDate")]
[Index("Location", Name = "IX_Jobs_Location")]
[Index("OrganizationName", Name = "IX_Jobs_OrganizationName")]
[Index("PostedDate", Name = "IX_Jobs_PostedDate")]
[Index("Slug", Name = "IX_Jobs_Slug", IsUnique = true)]
[Index("Status", Name = "IX_Jobs_Status")]
public partial class Job
{
    [Key]
    public int Id { get; set; }

    [StringLength(300)]
    public string Title { get; set; } = null!;

    [StringLength(300)]
    public string? TitleGujarati { get; set; }

    [StringLength(250)]
    public string Slug { get; set; } = null!;

    public string? ShortDescription { get; set; }

    [StringLength(500)]
    public string? ShortDescriptionGujarati { get; set; }

    public string? FullDescription { get; set; }

    public string? FullDescriptionGujarati { get; set; }

    [StringLength(300)]
    public string OrganizationName { get; set; } = null!;

    public string? PostDetails { get; set; }

    public int CategoryId { get; set; }

    [StringLength(300)]
    public string? Location { get; set; }

    [StringLength(500)]
    public string? DistrictIds { get; set; }

    [StringLength(200)]
    public string? Salary { get; set; }

    public int? ExperienceRequired { get; set; }

    public string? QualificationRequired { get; set; }

    public int? JobType { get; set; }

    public DateTime PostedDate { get; set; }

    public DateTime LastDate { get; set; }

    [StringLength(500)]
    public string? ApplicationLink { get; set; }

    public int Views { get; set; }

    public bool IsFeatured { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [StringLength(500)]
    public string? AdmitCardLink { get; set; }

    [StringLength(100)]
    public string? AdvertisementNumber { get; set; }

    public int ApplicationClicks { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? ApplicationFee { get; set; }

    [StringLength(1000)]
    public string? ApplicationFeeDetails { get; set; }

    [StringLength(50)]
    public string? ApplicationMode { get; set; }

    [StringLength(450)]
    public string? ApprovedById { get; set; }

    public DateTime? ApprovedDate { get; set; }

    public DateTime? ClosedDate { get; set; }

    [StringLength(500)]
    public string? ClosureReason { get; set; }

    [StringLength(100)]
    public string? ContractDuration { get; set; }

    public string? DetailedEligibility { get; set; }

    public int? DisplayOrder { get; set; }

    public string? DocumentsRequired { get; set; }

    /// <summary>
    /// Normalized "title|organization|lastdate" used to reject duplicate postings
    /// (e.g. the same notification re-imported twice). Unique-indexed.
    /// </summary>
    [StringLength(700)]
    public string DuplicateFingerprint { get; set; } = null!;

    public DateTime? ExamDate { get; set; }

    public string? ExamPattern { get; set; }

    [StringLength(1000)]
    public string? ExperienceDetails { get; set; }

    public string? HowToApply { get; set; }

    public string? ImportantNotes { get; set; }

    public DateTime? InterviewDate { get; set; }

    public bool IsNew { get; set; }

    public bool IsUrgent { get; set; }

    public string? KeyHighlights { get; set; }

    public int? MaxAge { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? MaxSalary { get; set; }

    [StringLength(500)]
    public string? MetaDescription { get; set; }

    [StringLength(500)]
    public string? MetaKeywords { get; set; }

    [StringLength(300)]
    public string? MetaTitle { get; set; }

    public int? MinAge { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? MinSalary { get; set; }

    public DateTime? NotificationDate { get; set; }

    [StringLength(500)]
    public string? OfficialNotificationPdf { get; set; }

    [StringLength(500)]
    public string? OfficialWebsite { get; set; }

    [StringLength(500)]
    public string? OrganizationLogo { get; set; }

    [StringLength(100)]
    public string? PortalName { get; set; }

    [StringLength(50)]
    public string? RecruitmentType { get; set; }

    [StringLength(500)]
    public string? ResultLink { get; set; }

    [StringLength(50)]
    public string? SalaryType { get; set; }

    public string? SelectionProcess { get; set; }

    public DateTime? StartDate { get; set; }

    [StringLength(50)]
    public string? State { get; set; }

    public int Status { get; set; }

    [StringLength(100)]
    public string? SubCategory { get; set; }

    [StringLength(500)]
    public string? SyllabusPdf { get; set; }

    [StringLength(500)]
    public string? TelegramLink { get; set; }

    public int? TotalPosts { get; set; }

    [StringLength(450)]
    public string? UpdatedById { get; set; }

    [StringLength(500)]
    public string? WhatsAppLink { get; set; }

    [StringLength(200)]
    public string? District { get; set; }

    [StringLength(300)]
    public string? NotificationFileName { get; set; }

    public string? ApplicationFeeJson { get; set; }

    public string? CategoryWiseVacancyJson { get; set; }

    public string? SelectionProcessJson { get; set; }

    public string? VacancyBreakdownJson { get; set; }

    [StringLength(30)]
    public string? FeaturedBadge { get; set; }

    public DateTime? FeaturedUntil { get; set; }

    [StringLength(300)]
    public string? FocusKeyword { get; set; }

    public string? SecondaryKeywordsJson { get; set; }

    public string? LsiKeywordsJson { get; set; }

    public string? FaqSchemaJson { get; set; }

    public string? InternalLinkAnchorsJson { get; set; }

    public string? ExamPatternJson { get; set; }

    public string? SalaryBreakdownJson { get; set; }

    public string? ImportantDatesJson { get; set; }

    [StringLength(300)]
    public string? OgTitle { get; set; }

    [StringLength(500)]
    public string? OgDescription { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("Jobs")]
    public virtual Category Category { get; set; } = null!;

    [ForeignKey("CreatedById")]
    [InverseProperty("Jobs")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;

    [InverseProperty("Job")]
    public virtual ICollection<JobDocument> JobDocuments { get; set; } = new List<JobDocument>();

    [InverseProperty("CreatedJob")]
    public virtual ICollection<JobDraftQueue> JobDraftQueues { get; set; } = new List<JobDraftQueue>();

    [InverseProperty("Job")]
    public virtual ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();
}
