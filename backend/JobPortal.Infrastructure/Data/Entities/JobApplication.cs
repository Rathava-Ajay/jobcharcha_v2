using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ApplicantUserId", Name = "IX_JobApplications_ApplicantUserId")]
[Index("EmployerJobId", "ApplicantUserId", Name = "IX_JobApplications_EmployerJobId_ApplicantUserId", IsUnique = true)]
[Index("Status", Name = "IX_JobApplications_Status")]
public partial class JobApplication
{
    [Key]
    public int Id { get; set; }

    public int EmployerJobId { get; set; }

    public string ApplicantUserId { get; set; } = null!;

    public string? CoverLetter { get; set; }

    [StringLength(500)]
    public string? ResumeUrl { get; set; }

    [StringLength(50)]
    public string? ExpectedSalary { get; set; }

    [StringLength(50)]
    public string? CurrentSalary { get; set; }

    [StringLength(50)]
    public string? NoticePeriod { get; set; }

    [StringLength(20)]
    public string Status { get; set; } = null!;

    public string? EmployerNotes { get; set; }

    public DateTime? InterviewDate { get; set; }

    [StringLength(300)]
    public string? InterviewLocation { get; set; }

    [StringLength(20)]
    public string? InterviewMode { get; set; }

    public bool IsRead { get; set; }

    public bool IsStarred { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("ApplicantUserId")]
    [InverseProperty("JobApplications")]
    public virtual AspNetUser ApplicantUser { get; set; } = null!;

    [ForeignKey("EmployerJobId")]
    [InverseProperty("JobApplications")]
    public virtual EmployerJob EmployerJob { get; set; } = null!;
}
