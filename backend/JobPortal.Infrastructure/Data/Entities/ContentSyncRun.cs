using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>One AI-agent sync run for one category. Status: 0 Queued, 1 Running, 2 Completed, 3 Failed, 4 Cancelled.</summary>
[Table("ContentSyncRuns")]
[Index("Category", "StartedAt", Name = "IX_ContentSyncRuns_Category_StartedAt")]
public partial class ContentSyncRun
{
    [Key]
    public int Id { get; set; }

    [StringLength(30)]
    public string Category { get; set; } = null!;

    public int Status { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? FinishedAt { get; set; }

    public int NewCount { get; set; }

    public int SkippedCount { get; set; }

    public int InvalidCount { get; set; }

    [StringLength(1000)]
    public string? ErrorMessage { get; set; }

    /// <summary>The agent's own one-line explanation of the run (e.g. why it found nothing).</summary>
    [StringLength(1000)]
    public string? Note { get; set; }

    [StringLength(500)]
    public string? LogPath { get; set; }

    [StringLength(450)]
    public string? TriggeredById { get; set; }
}
