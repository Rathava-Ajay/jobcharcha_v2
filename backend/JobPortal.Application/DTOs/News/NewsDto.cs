using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.News;

public class NewsDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string? TitleGujarati { get; set; }
    public string Slug { get; set; } = null!;
    public string? FeaturedImage { get; set; }
    public string Summary { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? ContentGujarati { get; set; }
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = "General";
    public string? Source { get; set; }
    public string? SourceLink { get; set; }
    public string PublishedDate { get; set; } = null!;
    public int Views { get; set; }
    public bool IsBreaking { get; set; }
    public bool IsFeatured { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
}

public class NewsListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? FeaturedImage { get; set; }
    public string Summary { get; set; } = null!;
    public string CategoryName { get; set; } = "General";
    public string PublishedDate { get; set; } = null!;
    public bool IsBreaking { get; set; }
    public bool IsFeatured { get; set; }
}

public class UpsertNewsRequest
{
    /// <summary>"Skip social posting" — publish without auto-sharing to Telegram/Facebook/Instagram.</summary>
    public bool SkipSocial { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? TitleGujarati { get; set; }
    [StringLength(300)] public string? Slug { get; set; }
    [StringLength(1000)] public string? FeaturedImage { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(2000)]
    public string Summary { get; set; } = null!;

    [Required(AllowEmptyStrings = false), StringLength(200000)]
    public string Content { get; set; } = null!;

    [StringLength(200000)] public string? ContentGujarati { get; set; }
    [Range(1, int.MaxValue)] public int? CategoryId { get; set; }
    [StringLength(200)] public string? Source { get; set; }
    [StringLength(500)] public string? SourceLink { get; set; }
    public DateTime PublishedDate { get; set; } = DateTime.UtcNow;
    public bool IsBreaking { get; set; }
    public bool IsFeatured { get; set; }
    [StringLength(300)] public string? MetaTitle { get; set; }
    [StringLength(500)] public string? MetaDescription { get; set; }
    [StringLength(500)] public string? MetaKeywords { get; set; }
    public bool IsActive { get; set; } = true;
}
