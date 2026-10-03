using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Social;

/// <summary>One label/value line of a post's key details (e.g. "Last date" / "15 Oct 2026"), already sanitized.</summary>
public record SocialDetail(string Label, string Value);

public class ShareAgainRequest
{
    [Required]
    public string Category { get; set; } = null!;

    public int EntityId { get; set; }
}

public class ApproveShareRequest
{
    /// <summary>Optional edited caption/message to post instead of the generated one.</summary>
    [StringLength(4096)]
    public string? Message { get; set; }
}

public class SocialShareSettingDto
{
    public string Category { get; set; } = null!;
    public bool TelegramEnabled { get; set; }
    public bool InstagramEnabled { get; set; }
    public bool FacebookEnabled { get; set; }
    public bool RequireApproval { get; set; }
    public string? TelegramTemplate { get; set; }
    public string? CaptionTemplate { get; set; }
    public string? Hashtags { get; set; }
    public string? ImageStyle { get; set; }
    public string ImageSize { get; set; } = "square";
    public string? BrandColor { get; set; }
    public string? AccentColor { get; set; }
    public string? LogoUrl { get; set; }
    public DateTime? UpdatedDate { get; set; }

    /// <summary>What is used when the matching custom template is empty — shown as the editor's starting point.</summary>
    public string DefaultTelegramTemplate { get; set; } = "";
    public string DefaultCaptionTemplate { get; set; } = "";
    public string DefaultHashtags { get; set; } = "";
    /// <summary>The {placeholders} the templates of this category understand.</summary>
    public List<string> Placeholders { get; set; } = new();
}

public class UpdateSocialShareSettingRequest
{
    public bool TelegramEnabled { get; set; }
    public bool InstagramEnabled { get; set; }
    public bool FacebookEnabled { get; set; }
    public bool RequireApproval { get; set; }

    [StringLength(2000)] public string? TelegramTemplate { get; set; }
    [StringLength(2000)] public string? CaptionTemplate { get; set; }
    [StringLength(1000)] public string? Hashtags { get; set; }
    [StringLength(500)] public string? ImageStyle { get; set; }
    [StringLength(10)] public string? ImageSize { get; set; }
    [StringLength(9)] public string? BrandColor { get; set; }
    [StringLength(9)] public string? AccentColor { get; set; }
    [StringLength(500)] public string? LogoUrl { get; set; }
}

public class SocialShareJobDto
{
    public int Id { get; set; }
    public string Category { get; set; } = null!;
    public int EntityId { get; set; }
    public string Channel { get; set; } = null!;
    public int Generation { get; set; }
    public int Status { get; set; }
    public int Attempts { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public string Title { get; set; } = null!;
    public string Url { get; set; } = null!;
    public string? ImageUrl { get; set; }
    public string? Message { get; set; }
    public string? ExternalId { get; set; }
    public string? Error { get; set; }
    public string Trigger { get; set; } = "publish";
    public DateTime CreatedDate { get; set; }
    public DateTime UpdatedDate { get; set; }
    public DateTime? PostedAt { get; set; }
}

public class SocialShareSummaryDto
{
    public int AwaitingApproval { get; set; }
    public int Queued { get; set; }
    public int Posted { get; set; }
    public int Failed { get; set; }
    public int Skipped { get; set; }
}
