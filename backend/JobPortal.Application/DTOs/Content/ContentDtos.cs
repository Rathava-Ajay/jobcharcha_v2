using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace JobPortal.Application.DTOs.Content;

/// <summary>Categories the AI Magic content pipeline covers (Jobs keep their own queue).</summary>
public static class ContentCategories
{
    public const string Job = "job";
    public const string Result = "result";
    public const string AdmitCard = "admitcard";
    public const string OldPaper = "oldpaper";
    public const string News = "news";
    public const string Scheme = "scheme";
    public const string Study = "study";

    public static readonly string[] All = { Job, Result, AdmitCard, OldPaper, News, Scheme, Study };

    /// <summary>Categories where a wrong item is cheap, so an admin may let AI drafts publish without review.
    /// Results, admit cards, jobs, schemes and old papers always need a human check.</summary>
    public static readonly string[] AutoPublishAllowed = { News, Study };

    public static readonly string[] Scopes = { "all", "gujarat" };

    public static string NormalizeScope(string? scope) => string.IsNullOrWhiteSpace(scope) ? "all" : scope.Trim().ToLowerInvariant();

    public static bool CanAutoPublish(string? category) => category is not null && AutoPublishAllowed.Contains(category);

    public static bool IsValid(string? category) => category is not null && All.Contains(category);
}

public static class ContentDraftStatus
{
    public const int Pending = 0;
    public const int Approved = 1;
    public const int Rejected = 2;
}

public static class ContentIngestOutcome
{
    public const string Created = "Created";
    public const string SkippedPending = "SkippedPending";
    public const string SkippedReviewed = "SkippedReviewed";
    public const string SkippedPublished = "SkippedPublished";
}

public static class ContentSyncStatus
{
    public const int Queued = 0;
    public const int Running = 1;
    public const int Completed = 2;
    public const int Failed = 3;
    public const int Cancelled = 4;
}

public class IngestContentDraftRequest
{
    [Required] public string Category { get; set; } = null!;
    public int? RunId { get; set; }
    [Required, StringLength(100)] public string SourceName { get; set; } = null!;
    [StringLength(1000)] public string? SourceUrl { get; set; }
    /// <summary>Optional one-line summary shown on the review card; falls back to the payload's own short text.</summary>
    [StringLength(500)] public string? Summary { get; set; }
    /// <summary>The category's create-request JSON (see the per-category prompt for the exact shape).</summary>
    [Required] public JsonElement Payload { get; set; }
}

public class ContentDraftIngestResultDto
{
    public string Outcome { get; set; } = null!;
    public ContentDraftListItemDto? Draft { get; set; }
}

public class ContentDraftListItemDto
{
    public int Id { get; set; }
    public string Category { get; set; } = null!;
    public string SourceName { get; set; } = null!;
    public string? SourceUrl { get; set; }
    public string Title { get; set; } = null!;
    public string? Summary { get; set; }
    public int Status { get; set; }
    public DateTime CreatedDate { get; set; }
    /// <summary>Heads-ups for the reviewer, e.g. a link that didn't respond. Empty when the draft looks clean.</summary>
    public List<string> Warnings { get; set; } = new();
    /// <summary>True when the draft was published automatically (auto-publish) rather than by an admin click.</summary>
    public bool AutoPublished { get; set; }
}

public class ContentDraftDto : ContentDraftListItemDto
{
    public JsonElement Payload { get; set; }
    public int? CreatedEntityId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
}

public class ApproveContentDraftRequest
{
    /// <summary>"Skip social posting" — publish without auto-sharing to Telegram/Facebook/Instagram.</summary>
    public bool SkipSocial { get; set; }

    /// <summary>Optional admin-edited payload; when omitted the stored payload is published as-is.</summary>
    public JsonElement? Payload { get; set; }
}

public class RejectContentDraftRequest
{
    [StringLength(500)] public string? ReviewNotes { get; set; }
}

public class ContentCategorySummaryDto
{
    public string Category { get; set; } = null!;
    public bool IsEnabled { get; set; } = true;
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public ContentSyncRunDto? LastRun { get; set; }
}

public class ContentApprovedResultDto
{
    public int CreatedEntityId { get; set; }
}

public class ContentSyncRunDto
{
    public int Id { get; set; }
    public string Category { get; set; } = null!;
    public int Status { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int NewCount { get; set; }
    public int SkippedCount { get; set; }
    public int InvalidCount { get; set; }
    public string? ErrorMessage { get; set; }
    /// <summary>The agent's one-line explanation of the run, e.g. why it found nothing.</summary>
    public string? Note { get; set; }
    public string Scope { get; set; } = "all";
}

public class StartContentSyncRequest
{
    /// <summary>One category, or null/omitted to sync every category one after another.</summary>
    public string? Category { get; set; }
    /// <summary>"all" (default) or "gujarat".</summary>
    public string? Scope { get; set; }
}

public class ContentCategorySettingDto
{
    public string Category { get; set; } = null!;
    public bool IsEnabled { get; set; }
    public int MaxItemsPerRun { get; set; }
    public int FreshnessDays { get; set; }
    public string? ExtraInstructions { get; set; }
    /// <summary>False while the category still uses the server defaults (no row saved yet).</summary>
    public bool IsCustomized { get; set; }
    /// <summary>Drafts publish without review. Only honoured for News and Study.</summary>
    public bool AutoPublish { get; set; }
    /// <summary>Whether this category may ever be auto-published (News and Study only).</summary>
    public bool AutoPublishAllowed { get; set; }
}

public class UpdateContentCategorySettingRequest
{
    public bool IsEnabled { get; set; } = true;
    [Range(1, 30)] public int MaxItemsPerRun { get; set; } = 10;
    [Range(1, 365)] public int FreshnessDays { get; set; } = 7;
    [StringLength(1000)] public string? ExtraInstructions { get; set; }
    public bool AutoPublish { get; set; }
}

public class ContentSourceDto
{
    public int Id { get; set; }
    public string Category { get; set; } = null!;
    public string Name { get; set; } = null!;
    public int SourceType { get; set; }
    public string Url { get; set; } = null!;
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class UpsertContentSourceRequest
{
    [Required] public string Category { get; set; } = null!;
    [Required, StringLength(150)] public string Name { get; set; } = null!;
    [Range(0, 1)] public int SourceType { get; set; }
    [Required, StringLength(1000)] public string Url { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}
