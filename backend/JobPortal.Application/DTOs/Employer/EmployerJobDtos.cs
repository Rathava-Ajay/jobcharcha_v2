using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Employer;

public class EmployerJobListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Department { get; set; }
    public string JobType { get; set; } = null!;
    public string City { get; set; } = null!;
    public string State { get; set; } = null!;
    public int? Openings { get; set; }
    public DateTime? LastDate { get; set; }
    public bool IsFeatured { get; set; }
    public string Status { get; set; } = null!;
    public bool IsActive { get; set; }
    public int ViewCount { get; set; }
    public int ApplicationCount { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class EmployerJobDto : EmployerJobListItemDto
{
    public string WorkMode { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? Requirements { get; set; }
    public string? Benefits { get; set; }
    public string? Skills { get; set; }
    public string Qualification { get; set; } = null!;
    public string? ExperienceRequired { get; set; }
    public string? SalaryMin { get; set; }
    public string? SalaryMax { get; set; }
    public bool IsSalaryNegotiable { get; set; }
    public bool HideSalary { get; set; }
    public bool IsUrgent { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
}

public class PublicEmployerJobListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string CompanyName { get; set; } = null!;
    public string? CompanyLogo { get; set; }
    public bool IsCompanyVerified { get; set; }
    public string JobType { get; set; } = null!;
    public string WorkMode { get; set; } = null!;
    public string City { get; set; } = null!;
    public string State { get; set; } = null!;
    public string? SalaryMin { get; set; }
    public string? SalaryMax { get; set; }
    public bool HideSalary { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsUrgent { get; set; }
    public DateTime? LastDate { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class PublicEmployerJobDetailDto : PublicEmployerJobListItemDto
{
    public string? Department { get; set; }
    public string Description { get; set; } = null!;
    public string? Requirements { get; set; }
    public string? Benefits { get; set; }
    public string? Skills { get; set; }
    public string Qualification { get; set; } = null!;
    public string? ExperienceRequired { get; set; }
    public bool IsSalaryNegotiable { get; set; }
    public int? Openings { get; set; }
    public bool HasApplied { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
}

/// <summary>A posting awaiting first-time moderation, shown in the admin queue.</summary>
public class AdminPendingEmployerJobDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string Status { get; set; } = null!;
    public int EmployerProfileId { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? EmployerEmail { get; set; }
    public bool EmployerEmailVerified { get; set; }
    public string City { get; set; } = null!;
    public string State { get; set; } = null!;
    public string JobType { get; set; } = null!;
    public string WorkMode { get; set; } = null!;
    public string? Department { get; set; }
    public string Description { get; set; } = null!;
    public string? Requirements { get; set; }
    public string? Benefits { get; set; }
    public string? Skills { get; set; }
    public string Qualification { get; set; } = null!;
    public string? ExperienceRequired { get; set; }
    public string? SalaryMin { get; set; }
    public string? SalaryMax { get; set; }
    public int? Openings { get; set; }
    public bool IsUrgent { get; set; }
    public DateTime? LastDate { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
    public DateTime CreatedDate { get; set; }
    public int PriorApprovedPostings { get; set; }
}

public class RejectEmployerJobRequest
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "A rejection reason is required.")]
    [StringLength(500, MinimumLength = 3)]
    public string Reason { get; set; } = null!;
}

public class UpsertEmployerJobRequest
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "Title is required.")]
    [StringLength(300, MinimumLength = 3, ErrorMessage = "Title must be between 3 and 300 characters.")]
    public string Title { get; set; } = null!;

    [StringLength(320)]
    public string? Slug { get; set; }

    [StringLength(100)]
    public string? Department { get; set; }

    [StringLength(20)]
    public string JobType { get; set; } = "Full-time";

    [StringLength(20)]
    public string WorkMode { get; set; } = "On-site";

    [Required(AllowEmptyStrings = false, ErrorMessage = "Description is required.")]
    [StringLength(20000, MinimumLength = 20, ErrorMessage = "Description must be between 20 and 20,000 characters.")]
    public string Description { get; set; } = null!;

    [StringLength(15000, ErrorMessage = "Requirements cannot exceed 15,000 characters.")]
    public string? Requirements { get; set; }

    [StringLength(8000, ErrorMessage = "Benefits cannot exceed 8,000 characters.")]
    public string? Benefits { get; set; }

    [StringLength(500)]
    public string? Skills { get; set; }

    [Required(AllowEmptyStrings = false, ErrorMessage = "Qualification is required.")]
    [StringLength(200, ErrorMessage = "Qualification cannot exceed 200 characters.")]
    public string Qualification { get; set; } = null!;

    [StringLength(20)]
    public string? ExperienceRequired { get; set; }

    [StringLength(50)]
    public string? SalaryMin { get; set; }

    [StringLength(50)]
    public string? SalaryMax { get; set; }

    public bool IsSalaryNegotiable { get; set; }
    public bool HideSalary { get; set; }

    [Required(AllowEmptyStrings = false, ErrorMessage = "City is required.")]
    [StringLength(100, ErrorMessage = "City cannot exceed 100 characters.")]
    public string City { get; set; } = null!;

    [Required(AllowEmptyStrings = false, ErrorMessage = "State is required.")]
    [StringLength(50, ErrorMessage = "State cannot exceed 50 characters.")]
    public string State { get; set; } = null!;

    [Range(1, 100000, ErrorMessage = "Openings must be a positive number.")]
    public int? Openings { get; set; }

    public bool IsUrgent { get; set; }
    public DateTime? LastDate { get; set; }

    [StringLength(500)]
    public string? AttachmentUrl { get; set; }

    [StringLength(260)]
    public string? AttachmentName { get; set; }
}
