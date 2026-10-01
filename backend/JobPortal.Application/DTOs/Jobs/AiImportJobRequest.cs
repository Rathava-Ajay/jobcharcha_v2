namespace JobPortal.Application.DTOs.Jobs;

public class FaqItemRequest
{
    public string Question { get; set; } = null!;
    public string Answer { get; set; } = null!;
}

public class VacancyBreakdownRowRequest
{
    public string PostName { get; set; } = null!;
    public int Sc { get; set; }
    public int St { get; set; }
    public int Obc { get; set; }
    public int Ews { get; set; }
    public int Ur { get; set; }
    public int Total { get; set; }
}

public class FeeRowRequest
{
    public string Category { get; set; } = null!;
    public string Fee { get; set; } = null!;
}

public class ExamPatternRowRequest
{
    public string Paper { get; set; } = null!;
    public string? Subject { get; set; }
    public int Questions { get; set; }
    public int Marks { get; set; }
    public string? Duration { get; set; }
    public string? Type { get; set; }
}

public class SalaryBreakdownRequest
{
    public string? BasicPay { get; set; }
    public string? Da { get; set; }
    public string? Hra { get; set; }
    public string? GrossSalary { get; set; }
    public string? NetSalary { get; set; }
}

public class ImportantDatesRequest
{
    public DateTime? NotificationDate { get; set; }
    public DateTime? ApplicationStart { get; set; }
    public DateTime? ApplicationEnd { get; set; }
    public DateTime? FeePaymentEnd { get; set; }
    public DateTime? AdmitCardDate { get; set; }
    public DateTime? ExamDate { get; set; }
    public DateTime? ResultDate { get; set; }
    /// <summary>Milestones with no exact day yet ("Tier 1 Exam: December 2026 (tentative)") or with no
    /// dedicated slot above — shown as-is in the Important Dates box.</summary>
    public List<OtherDateRequest> OtherDates { get; set; } = new();
}

public class OtherDateRequest
{
    public string Label { get; set; } = null!;
    public string Date { get; set; } = null!;
}

/// <summary>
/// Richer create request for the AI-assisted mobile posting flow — accepts the full SEO-content
/// JSON schema (focus/secondary/LSI keywords, FAQ schema, structured vacancy/fee/exam-pattern/salary
/// breakdowns, meta/OG tags) on top of the base facts. Kept separate from <see cref="UpsertJobRequest"/>
/// so the plain admin form's contract stays untouched.
/// </summary>
public class AiImportJobRequest
{
    public string Title { get; set; } = null!;
    public string? Slug { get; set; }
    public string Department { get; set; } = null!;
    public int CategoryId { get; set; }

    public string FocusKeyword { get; set; } = null!;
    public List<string> SecondaryKeywords { get; set; } = new();
    public List<string> LsiKeywords { get; set; } = new();
    public List<string> InternalLinkAnchors { get; set; } = new();

    public int? TotalPosts { get; set; }
    public string? Salary { get; set; }
    public string? AgeLimit { get; set; }
    public string? Qualification { get; set; }
    public string? Location { get; set; }
    public DateTime LastDate { get; set; }
    public string? ApplyLink { get; set; }
    public string? OfficialNotificationPdf { get; set; }
    public string? NotificationFileName { get; set; }

    // Scalar facts the detail page renders in its own slots (header Advt. No, Age Limit box,
    // Salary box, stats strip, Important Links table). Optional: older AI output omits them.
    public string? AdvertisementNumber { get; set; }
    public string? OfficialWebsite { get; set; }
    public string? SyllabusLink { get; set; }
    public string? State { get; set; }
    public string? District { get; set; }
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public int? ExperienceRequired { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public string? SalaryType { get; set; }
    public decimal? ApplicationFeeAmount { get; set; }
    public string? ApplicationFeeDetails { get; set; }

    public string ShortDescription { get; set; } = null!;

    /// <summary>Short direct-answer summary rendered in the "Job Summary" section — NOT the full multi-section
    /// content; the structured breakdowns below (vacancy/fee/exam-pattern/salary) cover the rest.</summary>
    public string Overview { get; set; } = null!;
    /// <summary>HTML unordered list — quick-scan bullet facts rendered in the "Key Highlights" section.</summary>
    public string? KeyHighlights { get; set; }
    /// <summary>HTML — full qualification/age-relaxation detail rendered under "Educational Qualification & Eligibility".
    /// Falls back to the plain qualification + age-limit text when not supplied.</summary>
    public string? EligibilityDetails { get; set; }
    /// <summary>HTML ordered list — step-by-step application instructions rendered in "Application Procedure".</summary>
    public string HowToApply { get; set; } = null!;
    /// <summary>HTML unordered list — guidelines/warnings rendered in the "Important Notes" section.</summary>
    public string? ImportantNotes { get; set; }
    /// <summary>HTML — documents candidates must upload/carry, rendered in the "Required Documents" section.</summary>
    public string? DocumentsRequired { get; set; }

    public List<FaqItemRequest> FaqSchema { get; set; } = new();
    public List<VacancyBreakdownRowRequest> VacancyBreakdown { get; set; } = new();
    public Dictionary<string, int> CategoryWiseVacancy { get; set; } = new();
    public List<FeeRowRequest> ApplicationFee { get; set; } = new();
    public List<string> SelectionProcess { get; set; } = new();
    public List<ExamPatternRowRequest> ExamPattern { get; set; } = new();
    public SalaryBreakdownRequest? SalaryBreakdown { get; set; }
    public ImportantDatesRequest? ImportantDates { get; set; }

    public string MetaTitle { get; set; } = null!;
    public string MetaDescription { get; set; } = null!;
    public string? MetaKeywords { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }

    public bool AutoPublish { get; set; } = true;
}
