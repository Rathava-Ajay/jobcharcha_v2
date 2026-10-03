using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>Admin-editable auto-share settings for one category. A category with no row uses the server defaults
/// (all channels on, approval required).</summary>
[Table("SocialShareSettings")]
public partial class SocialShareSetting
{
    [Key]
    [StringLength(30)]
    public string Category { get; set; } = null!;

    public bool TelegramEnabled { get; set; }
    public bool InstagramEnabled { get; set; }
    public bool FacebookEnabled { get; set; }

    /// <summary>When true, generated shares wait for an admin to preview and approve them.</summary>
    public bool RequireApproval { get; set; }

    [StringLength(2000)]
    public string? TelegramTemplate { get; set; }

    [StringLength(2000)]
    public string? CaptionTemplate { get; set; }

    [StringLength(1000)]
    public string? Hashtags { get; set; }

    /// <summary>Prompt fragment describing the background look, e.g. "clean blue gradient, abstract shapes".</summary>
    [StringLength(500)]
    public string? ImageStyle { get; set; }

    /// <summary>"square" (1080x1080) or "portrait" (1080x1350).</summary>
    [StringLength(10)]
    public string ImageSize { get; set; } = "square";

    [StringLength(9)]
    public string? BrandColor { get; set; }

    [StringLength(9)]
    public string? AccentColor { get; set; }

    [StringLength(500)]
    public string? LogoUrl { get; set; }

    public DateTime UpdatedDate { get; set; }
}
