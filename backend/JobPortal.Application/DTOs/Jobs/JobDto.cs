using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Jobs;

public class ImportantDateDto
{
    public string Label { get; set; } = null!;
    public string Date { get; set; } = null!;
}

public class JobDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string CompanyOrDept { get; set; } = null!;
    public string Category { get; set; } = null!;
    public int CategoryId { get; set; }
    public string Location { get; set; } = null!;
    public string? District { get; set; }
    public string? State { get; set; }
    public int VacancyCount { get; set; }
    public string Salary { get; set; } = null!;
    public string Qualification { get; set; } = null!;
    public string Type { get; set; } = "public";
    public string LastDate { get; set; } = null!;
    public string PostedDate { get; set; } = null!;
    public bool IsBoosted { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsNew { get; set; }
    public string Status { get; set; } = "Active";
    public string? OfficialNotificationUrl { get; set; }
    public string? ApplyUrl { get; set; }
    public string? SyllabusLink { get; set; }
    public string? OrganizationLogo { get; set; }
    public string? Overview { get; set; }
    public string? Eligibility { get; set; }
    public string? DocumentsRequired { get; set; }
    public List<ImportantDateDto> ImportantDates { get; set; } = new();
    public string? HowToApply { get; set; }
    public string? SelectionProcess { get; set; }
    public List<string> Tags { get; set; } = new();
    public int ViewsCount { get; set; }
    public int ApplyClicksCount { get; set; }
    public List<JobDto>? SimilarJobs { get; set; }

    // Rich detail fields (govtjobsalert.in-style depth)
    public string? KeyHighlights { get; set; }
    public string? ImportantNotes { get; set; }
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public string? SalaryType { get; set; }
    public int? ExperienceRequired { get; set; }
    public string? AdvertisementNumber { get; set; }
    public string? OfficialWebsite { get; set; }
    public string? TelegramLink { get; set; }
    public string? WhatsAppLink { get; set; }
    public decimal? ApplicationFee { get; set; }
    public string? ApplicationFeeDetails { get; set; }
    /// <summary>Raw JSON array of {PostName, ...categoryKeys, Total} rows — shape varies per job.</summary>
    public string? VacancyBreakdownJson { get; set; }
    /// <summary>Raw JSON object of {CategoryName: count} — shape varies per job.</summary>
    public string? CategoryWiseVacancyJson { get; set; }
    /// <summary>Raw JSON array of selection-stage step names, e.g. ["Written Exam","Interview"].</summary>
    public string? SelectionProcessJson { get; set; }
    /// <summary>Raw JSON array of {Category, Fee} rows.</summary>
    public string? ApplicationFeeJson { get; set; }

    // AI-import SEO fields (populated via the mobile AI-import flow; not yet rendered into public <head> tags/JSON-LD)
    public string? FocusKeyword { get; set; }
    /// <summary>Raw JSON array of secondary keyword strings.</summary>
    public string? SecondaryKeywordsJson { get; set; }
    /// <summary>Raw JSON array of LSI keyword strings.</summary>
    public string? LsiKeywordsJson { get; set; }
    /// <summary>Raw JSON array of {Question, Answer} rows.</summary>
    public string? FaqSchemaJson { get; set; }
    /// <summary>Raw JSON array of internal-link anchor text suggestions.</summary>
    public string? InternalLinkAnchorsJson { get; set; }
    /// <summary>Raw JSON array of {Paper, Subject, Questions, Marks, Duration, Type} rows.</summary>
    public string? ExamPatternJson { get; set; }
    /// <summary>Raw JSON object of {BasicPay, Da, Hra, GrossSalary, NetSalary}.</summary>
    public string? SalaryBreakdownJson { get; set; }
    /// <summary>Raw JSON object of named recruitment-cycle milestone dates.</summary>
    public string? ImportantDatesJson { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
}

public class JobListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string CompanyOrDept { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string Location { get; set; } = null!;
    public int VacancyCount { get; set; }
    public string Salary { get; set; } = null!;
    public string Qualification { get; set; } = null!;
    public string Type { get; set; } = "public";
    public string LastDate { get; set; } = null!;
    public string PostedDate { get; set; } = null!;
    public bool IsFeatured { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsNew { get; set; }
    public string Status { get; set; } = "Active";
    public List<string> Tags { get; set; } = new();
    public int ViewsCount { get; set; }
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public class JobQuery
{
    public string? Search { get; set; }
    public string? Category { get; set; }
    public string? Location { get; set; }
    public string? Qualification { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public bool? FeaturedOnly { get; set; }
    /// <summary>"newest" (default: featured first, then latest posted), "deadline" (soonest last date
    /// first), "popular" (most viewed) or "posts" (most vacancies).</summary>
    public string? Sort { get; set; }
    /// <summary>Only jobs whose last date falls within the next N days (today included).</summary>
    public int? ClosingWithinDays { get; set; }
    /// <summary>Hide jobs whose last date has already passed.</summary>
    public bool? OpenOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class UpsertJobRequest
{
    /// <summary>"Skip social posting" — publish without auto-sharing to Telegram/Facebook/Instagram.</summary>
    public bool SkipSocial { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(250)]
    public string? Slug { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(300)]
    public string OrganizationName { get; set; } = null!;

    [Range(1, int.MaxValue, ErrorMessage = "A valid category is required.")]
    public int CategoryId { get; set; }

    [StringLength(300)] public string? Location { get; set; }
    [StringLength(200)] public string? District { get; set; }
    [StringLength(50)] public string? State { get; set; }
    [Range(0, 1_000_000)] public int? TotalPosts { get; set; }
    [StringLength(200)] public string? Salary { get; set; }
    public string? QualificationRequired { get; set; }
    public DateTime PostedDate { get; set; } = DateTime.UtcNow;

    [Required] public DateTime LastDate { get; set; }

    [StringLength(500)] public string? ApplicationLink { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsNew { get; set; }
    [StringLength(1000)] public string? ShortDescription { get; set; }
    [StringLength(60000)] public string? FullDescription { get; set; }
    [StringLength(30000)] public string? DetailedEligibility { get; set; }
    [StringLength(30000)] public string? HowToApply { get; set; }
    [StringLength(20000)] public string? SelectionProcess { get; set; }
    [StringLength(500)] public string? OfficialNotificationPdf { get; set; }
    [StringLength(300)] public string? NotificationFileName { get; set; }
    [StringLength(500)] public string? SyllabusPdf { get; set; }
    [StringLength(500)] public string? OrganizationLogo { get; set; }

    [Range(0, 2)] public int Status { get; set; } = 1; // 0 Draft, 1 Published, 2 Closed
    public bool IsActive { get; set; } = true;
}
