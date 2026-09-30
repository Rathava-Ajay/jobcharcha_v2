using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Aspirant;

public class EducationEntry
{
    [StringLength(100)] public string? Qualification { get; set; }
    [StringLength(150)] public string? CourseDegree { get; set; }
    [StringLength(150)] public string? Specialization { get; set; }
    [StringLength(10)] public string? PassingYear { get; set; }
    [StringLength(200)] public string? UniversityBoard { get; set; }
    [StringLength(30)] public string? PercentageCgpa { get; set; }
}

public class SkillsBlock
{
    public List<string> Technical { get; set; } = new();
    public List<string> Computer { get; set; } = new();
    public List<string> Languages { get; set; } = new();
    public List<string> Other { get; set; } = new();
}

public class WorkExperienceEntry
{
    public bool IsCurrent { get; set; }
    [StringLength(200)] public string? Company { get; set; }
    [StringLength(200)] public string? JobTitle { get; set; }
    [StringLength(20)] public string? StartDate { get; set; }   // free "yyyy-MM" style string
    [StringLength(20)] public string? EndDate { get; set; }
    [StringLength(2000)] public string? Description { get; set; }
}

public class JobPreferences
{
    [StringLength(40)] public string? PreferredJobType { get; set; }
    public List<string> PreferredLocations { get; set; } = new();
    [StringLength(50)] public string? ExpectedSalary { get; set; }
    [StringLength(20)] public string? WorkMode { get; set; }        // On-site / Hybrid / Remote
    [StringLength(100)] public string? PreferredIndustry { get; set; }
    public bool WillingToRelocate { get; set; }
}

public class CompletionItem
{
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public bool Done { get; set; }
    public bool Required { get; set; }
}

public class AspirantProfileDto
{
    public string? PhotoUrl { get; set; }
    public string FullName { get; set; } = "";
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Email { get; set; } = "";
    public string? Mobile { get; set; }
    public string? DateOfBirth { get; set; }   // yyyy-MM-dd
    public string? Gender { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? State { get; set; }
    public string? AboutMe { get; set; }
    public string? Headline { get; set; }

    public List<EducationEntry> Education { get; set; } = new();
    public SkillsBlock Skills { get; set; } = new();
    public List<WorkExperienceEntry> WorkExperience { get; set; } = new();
    public JobPreferences Preferences { get; set; } = new();

    public string? ResumeUrl { get; set; }
    public string? ResumeFileName { get; set; }
    public string? ResumeUploadedAt { get; set; }

    public int CompletionScore { get; set; }
    public List<CompletionItem> CompletionChecklist { get; set; } = new();
    public bool NeedsSetup { get; set; }
}

public class UpsertAspirantProfileRequest
{
    [StringLength(50)] public string? FirstName { get; set; }
    [StringLength(50)] public string? LastName { get; set; }
    [StringLength(20)] public string? Mobile { get; set; }
    [StringLength(10)] public string? DateOfBirth { get; set; }
    [StringLength(20)] public string? Gender { get; set; }
    [StringLength(100)] public string? City { get; set; }
    [StringLength(100)] public string? District { get; set; }
    [StringLength(50)] public string? State { get; set; }
    [StringLength(2000)] public string? AboutMe { get; set; }
    [StringLength(200)] public string? Headline { get; set; }

    public List<EducationEntry>? Education { get; set; }
    public SkillsBlock? Skills { get; set; }
    public List<WorkExperienceEntry>? WorkExperience { get; set; }
    public JobPreferences? Preferences { get; set; }
}

public class SavedJobDto
{
    public int EmployerJobId { get; set; }
    public string Title { get; set; } = "";
    public string Slug { get; set; } = "";
    public string CompanyName { get; set; } = "";
    public string? City { get; set; }
    public string? State { get; set; }
    public string JobType { get; set; } = "";
    public string WorkMode { get; set; } = "";
    public DateTime? LastDate { get; set; }
    public bool HasApplied { get; set; }
    public DateTime SavedAt { get; set; }
}

public class SaveJobRequest
{
    [Range(1, int.MaxValue)]
    public int EmployerJobId { get; set; }
}
