using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>One share of one published post to one channel. Doubles as the durable queue (Status Pending +
/// NextAttemptAt) and the activity log. Status: 0 AwaitingApproval, 1 Pending, 2 Posted, 3 Failed, 4 Skipped,
/// 5 Processing. The unique (Category, EntityId, Channel, Generation) index is the idempotency guard; "Share again"
/// creates the next Generation.</summary>
[Table("SocialShareJobs")]
[Index("Category", "EntityId", "Channel", "Generation", Name = "UX_SocialShareJobs_Post", IsUnique = true)]
[Index("Status", "NextAttemptAt", Name = "IX_SocialShareJobs_Status_NextAttemptAt")]
public partial class SocialShareJob
{
    [Key]
    public int Id { get; set; }

    [StringLength(30)]
    public string Category { get; set; } = null!;

    public int EntityId { get; set; }

    [StringLength(20)]
    public string Channel { get; set; } = null!;

    public int Generation { get; set; }

    public int Status { get; set; }

    public int Attempts { get; set; }

    public DateTime? NextAttemptAt { get; set; }

    [StringLength(300)]
    public string Title { get; set; } = null!;

    [StringLength(500)]
    public string Url { get; set; } = null!;

    /// <summary>Sanitized snapshot of the post facts (last date, vacancies, ...) taken when the share was queued,
    /// so a later edit can't change what an in-flight share says.</summary>
    public string DetailsJson { get; set; } = "{}";

    /// <summary>Generated once and reused by retries and by the other channels.</summary>
    [StringLength(500)]
    public string? ImageUrl { get; set; }

    public string? Message { get; set; }

    /// <summary>Telegram message_id / Facebook post id / Instagram media id.</summary>
    [StringLength(100)]
    public string? ExternalId { get; set; }

    [StringLength(1000)]
    public string? Error { get; set; }

    /// <summary>"publish" or "manual".</summary>
    [StringLength(10)]
    public string Trigger { get; set; } = "publish";

    [StringLength(450)]
    public string? RequestedById { get; set; }

    public DateTime CreatedDate { get; set; }
    public DateTime UpdatedDate { get; set; }
    public DateTime? PostedAt { get; set; }
}
