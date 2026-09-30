using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("UserId", Name = "IX_JobSeekerProfiles_UserId", IsUnique = true)]
public partial class JobSeekerProfile
{
    [Key]
    public Guid Id { get; set; }

    public string UserId { get; set; } = null!;

    [StringLength(200)]
    public string? Headline { get; set; }

    public string? AboutMe { get; set; }

    [StringLength(500)]
    public string? ResumeUrl { get; set; }

    [StringLength(1000)]
    public string? Skills { get; set; }

    public int ExperienceYears { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal? CurrentSalary { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal? ExpectedSalary { get; set; }

    public int NoticePeriodDays { get; set; }

    [StringLength(100)]
    public string? CurrentCity { get; set; }

    [StringLength(300)]
    public string? PreferredCities { get; set; }

    public string? Education { get; set; }

    public string? WorkExperience { get; set; }

    public bool IsOpenToWork { get; set; }

    public int ProfileCompletionScore { get; set; }

    // --- Aspirant Career Hub (structured profile) ---

    [StringLength(20)]
    public string? Gender { get; set; }

    [StringLength(100)]
    public string? District { get; set; }

    /// <summary>JSON array: [{ qualification, courseDegree, specialization, passingYear, universityBoard, percentageCgpa }].
    /// The flat <see cref="Education"/> text is kept in sync so employer candidate search still works.</summary>
    public string? EducationJson { get; set; }

    /// <summary>JSON object: { technical:[], computer:[], languages:[], other:[] }. Flat <see cref="Skills"/> CSV kept in sync.</summary>
    public string? SkillsJson { get; set; }

    /// <summary>JSON array: [{ isCurrent, company, jobTitle, startDate, endDate, description }]. Flat <see cref="WorkExperience"/> kept in sync.</summary>
    public string? WorkExperienceJson { get; set; }

    /// <summary>JSON object: { preferredJobType, preferredLocations:[], expectedSalary, workMode, preferredIndustry, willingToRelocate }.</summary>
    public string? JobPreferencesJson { get; set; }

    public DateTime? ResumeUploadedAt { get; set; }

    /// <summary>Set the first time the required-fields set is fully filled. Null =&gt; first-login setup gate is active.</summary>
    public DateTime? ProfileCompletedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("JobSeekerProfile")]
    public virtual AspNetUser User { get; set; } = null!;
}
