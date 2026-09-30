namespace JobPortal.Application.DTOs.Results;

public class ResultFaqItemRequest
{
    public string Question { get; set; } = null!;
    public string Answer { get; set; } = null!;
}

public class CutOffRowRequest
{
    public string PostName { get; set; } = null!;
    public string? General { get; set; }
    public string? Sc { get; set; }
    public string? St { get; set; }
    public string? Obc { get; set; }
    public string? Ews { get; set; }
}

/// <summary>
/// Richer create request for the AI-assisted mobile posting flow — mirrors Jobs' <c>AiImportJobRequest</c>
/// pattern for Results. Kept separate from <see cref="UpsertResultRequest"/> so the plain admin form's
/// contract stays untouched.
/// </summary>
public class AiImportResultRequest
{
    public string Title { get; set; } = null!;
    public string? Slug { get; set; }
    public string? ExamName { get; set; }
    public string OrganizationName { get; set; } = null!;
    public int CategoryId { get; set; }

    public string FocusKeyword { get; set; } = null!;
    public List<string> SecondaryKeywords { get; set; } = new();
    public List<string> LsiKeywords { get; set; } = new();
    public List<string> InternalLinkAnchors { get; set; } = new();

    public DateTime ResultDate { get; set; }
    public DateTime? ExamDate { get; set; }
    public string? ResultLink { get; set; }
    public string? ResultPdf { get; set; }
    public string? CutOffMarks { get; set; }
    public string? SelectedCandidates { get; set; }
    public string? State { get; set; }
    public string? Location { get; set; }

    public string ShortDescription { get; set; } = null!;
    public string Description { get; set; } = null!;

    public List<ResultFaqItemRequest> FaqSchema { get; set; } = new();
    public List<CutOffRowRequest> CutOffBreakdown { get; set; } = new();

    public string MetaTitle { get; set; } = null!;
    public string MetaDescription { get; set; } = null!;
    public string? MetaKeywords { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }

    public bool AutoPublish { get; set; } = true;
}
