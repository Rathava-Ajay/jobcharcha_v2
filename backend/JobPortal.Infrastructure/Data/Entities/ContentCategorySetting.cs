using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>Admin-editable AI Magic settings for one content category. A category with no row uses the
/// ContentSync:* config defaults and is enabled.</summary>
[Table("ContentCategorySettings")]
public partial class ContentCategorySetting
{
    [Key]
    [StringLength(30)]
    public string Category { get; set; } = null!;

    public bool IsEnabled { get; set; }

    public int MaxItemsPerRun { get; set; }

    public int FreshnessDays { get; set; }

    /// <summary>Free-text extra guidance appended to the agent's prompt (e.g. "Gujarat only").</summary>
    [StringLength(1000)]
    public string? ExtraInstructions { get; set; }

    public DateTime UpdatedDate { get; set; }

    /// <summary>When true, clean drafts of this category publish without review. Only allowed for categories in
    /// ContentCategories.AutoPublishAllowed.</summary>
    public bool AutoPublish { get; set; }

    /// <summary>The admin who switched auto-publish on; published items are attributed to them.</summary>
    [StringLength(450)]
    public string? AutoPublishUserId { get; set; }
}
