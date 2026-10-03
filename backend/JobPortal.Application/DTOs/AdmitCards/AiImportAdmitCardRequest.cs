namespace JobPortal.Application.DTOs.AdmitCards;

public class AdmitCardFaqItemRequest
{
    public string Question { get; set; } = null!;
    public string Answer { get; set; } = null!;
}

/// <summary>
/// Richer create request for the AI-assisted mobile posting flow — mirrors Jobs'/Results'
/// <c>AiImport*Request</c> pattern for Admit Cards. Kept separate from
/// <see cref="UpsertAdmitCardRequest"/> so the plain admin form's contract stays untouched.
/// </summary>
public class AiImportAdmitCardRequest
{
    /// <summary>"Skip social posting" — publish without auto-sharing to Telegram/Facebook/Instagram.</summary>
    public bool SkipSocial { get; set; }

    public string Title { get; set; } = null!;
    public string? Slug { get; set; }
    public string? ExamName { get; set; }
    public string OrganizationName { get; set; } = null!;
    public int CategoryId { get; set; }

    public string FocusKeyword { get; set; } = null!;
    public List<string> SecondaryKeywords { get; set; } = new();
    public List<string> LsiKeywords { get; set; } = new();
    public List<string> InternalLinkAnchors { get; set; } = new();

    public DateTime AdmitCardReleaseDate { get; set; }
    public DateTime? ExamDate { get; set; }
    public string? DownloadLink { get; set; }
    public string? AdmitCardPdf { get; set; }
    public string? PostName { get; set; }
    public int? Year { get; set; }
    public string? State { get; set; }
    public string? Location { get; set; }

    public string ShortDescription { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? HowToDownload { get; set; }
    /// <summary>Joined into the entity's existing Instructions column.</summary>
    public List<string> InstructionsForExam { get; set; } = new();
    /// <summary>Joined into the entity's existing ImportantNotes column.</summary>
    public List<string> DocumentsToCarryForExam { get; set; } = new();

    public List<AdmitCardFaqItemRequest> FaqSchema { get; set; } = new();

    public string MetaTitle { get; set; } = null!;
    public string MetaDescription { get; set; } = null!;
    public string? MetaKeywords { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }

    public bool AutoPublish { get; set; } = true;
}
