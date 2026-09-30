using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Results;

public class ResultDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? ExamName { get; set; }
    public string OrganizationName { get; set; } = null!;
    public string? OrganizationLogo { get; set; }
    public string Category { get; set; } = "General";
    public int? CategoryId { get; set; }
    public string ResultDate { get; set; } = null!;
    public string? ExamDate { get; set; }
    public string? ResultLink { get; set; }
    public string? ResultPdf { get; set; }
    public string? CutOffMarks { get; set; }
    public string? SelectedCandidates { get; set; }
    public string? State { get; set; }
    public string? District { get; set; }
    public string? Description { get; set; }
    public int ViewsCount { get; set; }
    public bool IsFeatured { get; set; }

    // AI-import SEO fields (populated via the mobile AI-import flow; not yet rendered into public <head> tags/JSON-LD)
    public string? ShortDescription { get; set; }
    public string? FocusKeyword { get; set; }
    public string? SecondaryKeywordsJson { get; set; }
    public string? LsiKeywordsJson { get; set; }
    public string? FaqSchemaJson { get; set; }
    public string? InternalLinkAnchorsJson { get; set; }
    public string? CutOffBreakdownJson { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
}

public class ResultListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? ExamName { get; set; }
    public string OrganizationName { get; set; } = null!;
    public string Category { get; set; } = "General";
    public string ResultDate { get; set; } = null!;
    public bool IsFeatured { get; set; }
    public int ViewsCount { get; set; }
}

public class UpsertResultRequest
{
    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? Slug { get; set; }
    [StringLength(200)] public string? ExamName { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(300)]
    public string OrganizationName { get; set; } = null!;

    [StringLength(500)] public string? OrganizationLogo { get; set; }
    [Range(1, int.MaxValue)] public int? CategoryId { get; set; }
    public DateTime ResultDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExamDate { get; set; }
    [StringLength(500)] public string? ResultLink { get; set; }
    [StringLength(500)] public string? ResultPdf { get; set; }
    [StringLength(2000)] public string? CutOffMarks { get; set; }
    [StringLength(2000)] public string? SelectedCandidates { get; set; }
    [StringLength(50)] public string? State { get; set; }
    [StringLength(200)] public string? District { get; set; }
    [StringLength(60000)] public string? Description { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
}
