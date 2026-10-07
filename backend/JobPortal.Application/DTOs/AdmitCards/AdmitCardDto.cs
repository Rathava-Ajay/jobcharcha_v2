using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.AdmitCards;

public class AdmitCardDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? ExamName { get; set; }
    public string OrganizationName { get; set; } = null!;
    public string? OrganizationLogo { get; set; }
    public string Category { get; set; } = "General";
    public int? CategoryId { get; set; }
    public string ReleaseDate { get; set; } = null!;
    public string? ExamDate { get; set; }
    public string Status { get; set; } = "Released"; // Released | Upcoming
    public string? DownloadUrl { get; set; }
    public string? DownloadLink { get; set; }
    public string? AdmitCardPdf { get; set; }
    public string? PostName { get; set; }
    public int? Year { get; set; }
    public string? State { get; set; }
    public string? District { get; set; }
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public string? HowToDownload { get; set; }
    public string? ImportantNotes { get; set; }
    public int ViewsCount { get; set; }
    public int DownloadCount { get; set; }
    public bool IsFeatured { get; set; }

    // AI-import SEO fields (populated via the mobile AI-import flow; not yet rendered into public <head> tags/JSON-LD)
    public string? ShortDescription { get; set; }
    public string? FocusKeyword { get; set; }
    public string? SecondaryKeywordsJson { get; set; }
    public string? LsiKeywordsJson { get; set; }
    public string? FaqSchemaJson { get; set; }
    public string? InternalLinkAnchorsJson { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
}

public class AdmitCardListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? ExamName { get; set; }
    public string OrganizationName { get; set; } = null!;
    public string Category { get; set; } = "General";
    public string ReleaseDate { get; set; } = null!;
    public string? ExamDate { get; set; }
    public string Status { get; set; } = "Released";
    public bool IsFeatured { get; set; }
    public int ViewsCount { get; set; }
}

public class UpsertAdmitCardRequest
{
    /// <summary>"Skip social posting" — publish without auto-sharing to Telegram/Facebook/Instagram.</summary>
    public bool SkipSocial { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? Slug { get; set; }
    [StringLength(200)] public string? ExamName { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(300)]
    public string OrganizationName { get; set; } = null!;

    [StringLength(500)] public string? OrganizationLogo { get; set; }
    [Range(1, int.MaxValue)] public int? CategoryId { get; set; }
    public DateTime AdmitCardReleaseDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExamDate { get; set; }
    [StringLength(500)] public string? DownloadLink { get; set; }
    [StringLength(500)] public string? AdmitCardPdf { get; set; }
    [StringLength(500)] public string? PostName { get; set; }
    [Range(1950, 2100)] public int? Year { get; set; }
    [StringLength(50)] public string? State { get; set; }
    [StringLength(200)] public string? District { get; set; }
    [StringLength(60000)] public string? Description { get; set; }
    [StringLength(30000)] public string? Instructions { get; set; }
    [StringLength(20000)] public string? HowToDownload { get; set; }
    [StringLength(30000)] public string? ImportantNotes { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
}
