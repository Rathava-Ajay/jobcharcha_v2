using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Employer;

public class EmployerPlanDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
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
    public bool IsActive { get; set; }
}

public class UpsertEmployerPlanRequest
{
    [Required(AllowEmptyStrings = false), StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = null!;

    [StringLength(2000)] public string? Description { get; set; }
    [Range(0, 1_000_000)] public decimal Price { get; set; }
    [Range(0, 3660)] public int DurationDays { get; set; }
    public bool IsTopUp { get; set; }
    [Range(0, 1_000_000)] public int IncludedCredits { get; set; }
    public bool IsUnlimitedCredits { get; set; }
    [Range(0, 100000)] public int MaxActiveJobs { get; set; }
    [Range(0, 100000)] public int MaxFeaturedJobs { get; set; }
    public bool CanAccessResumes { get; set; }
    [Range(0, 1_000_000)] public int ResumeViewsPerMonth { get; set; }
    [Range(0, 100000)] public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
