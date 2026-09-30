namespace JobPortal.Application.DTOs.Employer;

public class JobApplicationDto
{
    public int Id { get; set; }
    public int EmployerJobId { get; set; }
    public string JobTitle { get; set; } = null!;
    public string ApplicantName { get; set; } = null!;
    public string ApplicantEmail { get; set; } = null!;
    public string? ApplicantPhone { get; set; }
    public string? ResumeUrl { get; set; }
    public string? CoverLetter { get; set; }
    public string? ExpectedSalary { get; set; }
    public string? CurrentSalary { get; set; }
    public string? NoticePeriod { get; set; }
    public string Status { get; set; } = null!;
    public string? EmployerNotes { get; set; }
    public DateTime? InterviewDate { get; set; }
    public string? InterviewLocation { get; set; }
    public string? InterviewMode { get; set; }
    public bool IsRead { get; set; }
    public bool IsStarred { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class MyApplicationDto
{
    public int Id { get; set; }
    public int EmployerJobId { get; set; }
    public string JobTitle { get; set; } = null!;
    public string JobSlug { get; set; } = null!;
    public string CompanyName { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime? InterviewDate { get; set; }
    public string? InterviewLocation { get; set; }
    public string? InterviewMode { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class ApplyToJobRequest
{
    public string? CoverLetter { get; set; }
    public string? ExpectedSalary { get; set; }
    public string? CurrentSalary { get; set; }
    public string? NoticePeriod { get; set; }
}

public class UpdateApplicationStatusRequest
{
    public string Status { get; set; } = null!;
    public string? EmployerNotes { get; set; }
    public DateTime? InterviewDate { get; set; }
    public string? InterviewLocation { get; set; }
    public string? InterviewMode { get; set; }
}
