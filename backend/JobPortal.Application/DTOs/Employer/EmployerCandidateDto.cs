namespace JobPortal.Application.DTOs.Employer;

public class CandidateSearchQuery
{
    public string? Skills { get; set; }
    public int? MinExperience { get; set; }
    public int? MaxExperience { get; set; }
    public string? City { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public string? Education { get; set; }
    public int? MaxNoticePeriodDays { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class CandidateListItemDto
{
    public string UserId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Headline { get; set; }
    public int ExperienceYears { get; set; }
    public string? CurrentCity { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public string? Skills { get; set; }
    public string? Education { get; set; }
    public int NoticePeriodDays { get; set; }
    public string MaskedPhone { get; set; } = null!;
    public string MaskedEmail { get; set; } = null!;
    public bool IsAlreadyContacted { get; set; }
}

public class CandidateProfileDto
{
    public string UserId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Headline { get; set; }
    public string? AboutMe { get; set; }
    public string? ResumeUrl { get; set; }
    public string? Skills { get; set; }
    public int ExperienceYears { get; set; }
    public decimal? CurrentSalary { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public int NoticePeriodDays { get; set; }
    public string? CurrentCity { get; set; }
    public string? PreferredCities { get; set; }
    public string? Education { get; set; }
    public string? WorkExperience { get; set; }
    public bool IsAlreadyContacted { get; set; }
    /// <summary>Populated (unmasked) only when IsAlreadyContacted is true; otherwise masked.</summary>
    public string Phone { get; set; } = null!;
    public string Email { get; set; } = null!;
}
