using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Table("JobDraftQueue")]
[Index("CreatedJobId", Name = "IX_JobDraftQueue_CreatedJobId")]
[Index("DedupeKey", Name = "IX_JobDraftQueue_DedupeKey", IsUnique = true)]
[Index("FeedSourceId", Name = "IX_JobDraftQueue_FeedSourceId")]
[Index("Status", "CreatedDate", Name = "IX_JobDraftQueue_Status_CreatedDate")]
[Index("SuggestedCategoryId", Name = "IX_JobDraftQueue_SuggestedCategoryId")]
public partial class JobDraftQueue
{
    [Key]
    public int Id { get; set; }

    public int? FeedSourceId { get; set; }

    [StringLength(100)]
    public string SourceName { get; set; } = null!;

    [StringLength(1000)]
    public string? SourceUrl { get; set; }

    [StringLength(64)]
    public string DedupeKey { get; set; } = null!;

    /// <summary>Stable per-post identifier taken from the source itself (advertisement number, Telegram
    /// channel/message id), normalized. Unlike DedupeKey it doesn't depend on AI-extracted wording, so the
    /// same notice re-scraped with a slightly different title/org still matches. Unique when set.</summary>
    [StringLength(200)]
    public string? SourcePostKey { get; set; }

    [StringLength(300)]
    public string Title { get; set; } = null!;

    [StringLength(300)]
    public string? OrganizationName { get; set; }

    public int? TotalPosts { get; set; }

    public DateTime? LastDate { get; set; }

    public DateTime? NotificationDate { get; set; }

    [StringLength(500)]
    public string? ShortDescription { get; set; }

    public string? RawContent { get; set; }

    public int? SuggestedCategoryId { get; set; }

    [StringLength(50)]
    public string? State { get; set; }

    public int Status { get; set; }

    public int? CreatedJobId { get; set; }

    [StringLength(450)]
    public string? ReviewedById { get; set; }

    public DateTime? ReviewedAt { get; set; }

    [StringLength(500)]
    public string? ReviewNotes { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CreatedJobId")]
    [InverseProperty("JobDraftQueues")]
    public virtual Job? CreatedJob { get; set; }

    [ForeignKey("FeedSourceId")]
    [InverseProperty("JobDraftQueues")]
    public virtual JobFeedSource? FeedSource { get; set; }

    [ForeignKey("SuggestedCategoryId")]
    [InverseProperty("JobDraftQueues")]
    public virtual Category? SuggestedCategory { get; set; }
}
