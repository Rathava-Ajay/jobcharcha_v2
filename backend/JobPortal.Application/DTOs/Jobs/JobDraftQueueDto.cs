namespace JobPortal.Application.DTOs.Jobs;

/// <summary>Status values for JobDraftQueue.Status: 0 Pending, 1 Approved, 2 Rejected.</summary>
public static class JobDraftStatus
{
    public const int Pending = 0;
    public const int Approved = 1;
    public const int Rejected = 2;
}

public class JobFeedSourceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? OrganizationHint { get; set; }
    public int SourceType { get; set; }
    public string Url { get; set; } = null!;
    public int? DefaultCategoryId { get; set; }
    public string? DefaultCategoryName { get; set; }
    public string? StateHint { get; set; }
    public DateTime? LastFetchedAt { get; set; }
    public int LastFetchNewCount { get; set; }
    public int LastFetchSkippedReviewedCount { get; set; }
    public int LastFetchSkippedPendingCount { get; set; }
    public string? LastError { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class UpsertJobFeedSourceRequest
{
    public string Name { get; set; } = null!;
    public string? OrganizationHint { get; set; }
    public int SourceType { get; set; }
    public string Url { get; set; } = null!;
    public int? DefaultCategoryId { get; set; }
    public string? StateHint { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Reports the outcome of one fetch cycle back onto the source row (called by the watcher agent).
/// The counts are tallies of the `outcome` values /ingest returned during that cycle.</summary>
public class ReportFeedFetchRequest
{
    /// <summary>Outcome "Created".</summary>
    public int NewDraftCount { get; set; }
    /// <summary>Outcomes "SkippedReviewed" + "SkippedPublished".</summary>
    public int SkippedReviewedCount { get; set; }
    /// <summary>Outcome "SkippedPending".</summary>
    public int SkippedPendingCount { get; set; }
    public string? Error { get; set; }
}

/// <summary>What /ingest did with one posting.</summary>
public static class JobDraftIngestOutcome
{
    /// <summary>Genuinely new — added to Pending Review.</summary>
    public const string Created = "Created";
    /// <summary>Already in the queue and still Pending — no duplicate row created.</summary>
    public const string SkippedPending = "SkippedPending";
    /// <summary>Already Approved/Rejected (or removed from the queue) — left untouched.</summary>
    public const string SkippedReviewed = "SkippedReviewed";
    /// <summary>No queue row, but an identical job is already live on the site.</summary>
    public const string SkippedPublished = "SkippedPublished";
}

public class JobDraftIngestResultDto
{
    public string Outcome { get; set; } = null!;
    /// <summary>The new or matching existing draft; null for SkippedPublished.</summary>
    public JobDraftQueueDto? Draft { get; set; }
}

public class JobDraftQueueListItemDto
{
    public int Id { get; set; }
    public string SourceName { get; set; } = null!;
    public string? SourceUrl { get; set; }
    public string Title { get; set; } = null!;
    public string? OrganizationName { get; set; }
    public int? TotalPosts { get; set; }
    public DateTime? LastDate { get; set; }
    public string? ShortDescription { get; set; }
    public int? SuggestedCategoryId { get; set; }
    public string? SuggestedCategoryName { get; set; }
    public string? State { get; set; }
    public int Status { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class JobDraftQueueDto : JobDraftQueueListItemDto
{
    public int? FeedSourceId { get; set; }
    public DateTime? NotificationDate { get; set; }
    public string? RawContent { get; set; }
    public int? CreatedJobId { get; set; }
    public string? ReviewedById { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
}

/// <summary>Posted by the watcher agent for each item it finds on a watched source. Dedupe is server-side:
/// primarily on SourcePostId (or an "Advt No:" parsed out of RawContent), falling back to
/// Title+OrganizationName+LastDate (same normalization as JobService's DuplicateFingerprint).</summary>
public class CreateJobDraftRequest
{
    public int? FeedSourceId { get; set; }
    /// <summary>The source's own id for this post — advertisement number (e.g. "GPSC/202627/42") or,
    /// for Telegram, "channel/messageId". Optional but strongly preferred: AI-extracted titles vary run to run.</summary>
    public string? SourcePostId { get; set; }
    public string SourceName { get; set; } = null!;
    public string? SourceUrl { get; set; }
    public string Title { get; set; } = null!;
    public string? OrganizationName { get; set; }
    public int? TotalPosts { get; set; }
    public DateTime? LastDate { get; set; }
    public DateTime? NotificationDate { get; set; }
    public string? ShortDescription { get; set; }
    public string? RawContent { get; set; }
    public int? SuggestedCategoryId { get; set; }
    public string? State { get; set; }
}

public class RejectJobDraftRequest
{
    public string? ReviewNotes { get; set; }
}
