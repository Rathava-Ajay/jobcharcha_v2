using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>Admin-added website / Telegram channel the AI agent should prefer for one non-job category.
/// Separate from JobFeedSource on purpose: the job watcher treats every active JobFeedSource as a job source.</summary>
[Table("ContentSources")]
[Index("Category", "IsActive", Name = "IX_ContentSources_Category_IsActive")]
public partial class ContentSource
{
    [Key]
    public int Id { get; set; }

    [StringLength(30)]
    public string Category { get; set; } = null!;

    [StringLength(150)]
    public string Name { get; set; } = null!;

    /// <summary>0 = Website, 1 = Telegram channel.</summary>
    public int SourceType { get; set; }

    [StringLength(1000)]
    public string Url { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }
}
