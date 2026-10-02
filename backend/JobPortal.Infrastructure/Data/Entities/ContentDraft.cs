using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>AI-collected item for any non-job category (result, admit card, old paper, news, scheme,
/// study note) waiting for admin review. PayloadJson is the exact create-request JSON of the target
/// category, so approving it just deserializes and calls that category's existing create service.</summary>
[Table("ContentDrafts")]
[Index("DedupeKey", Name = "IX_ContentDrafts_DedupeKey", IsUnique = true)]
[Index("Category", "Status", "CreatedDate", Name = "IX_ContentDrafts_Category_Status_CreatedDate")]
public partial class ContentDraft
{
    [Key]
    public int Id { get; set; }

    [StringLength(30)]
    public string Category { get; set; } = null!;

    [StringLength(100)]
    public string SourceName { get; set; } = null!;

    [StringLength(1000)]
    public string? SourceUrl { get; set; }

    [StringLength(64)]
    public string DedupeKey { get; set; } = null!;

    [StringLength(300)]
    public string Title { get; set; } = null!;

    [StringLength(500)]
    public string? Summary { get; set; }

    public string PayloadJson { get; set; } = null!;

    /// <summary>Newline-separated heads-ups found at ingest (e.g. "downloadLink returned HTTP 500"); null when clean.</summary>
    [StringLength(1000)]
    public string? Warnings { get; set; }

    public int Status { get; set; }

    public int? CreatedEntityId { get; set; }

    public int? SyncRunId { get; set; }

    [StringLength(450)]
    public string? ReviewedById { get; set; }

    public DateTime? ReviewedAt { get; set; }

    [StringLength(500)]
    public string? ReviewNotes { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }
}
