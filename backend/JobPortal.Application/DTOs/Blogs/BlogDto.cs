using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Blogs;

public class BlogDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string? TitleGujarati { get; set; }
    public string Slug { get; set; } = null!;
    public string? FeaturedImage { get; set; }
    public string? OfficialNotificationUrl { get; set; }
    public string Excerpt { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? ContentGujarati { get; set; }
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = "General";
    public string? Tags { get; set; }
    public string? Author { get; set; }
    public string PublishedDate { get; set; } = null!;
    public int Views { get; set; }
    public int ReadTime { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPublished { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
}

public class BlogListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? FeaturedImage { get; set; }
    public string Excerpt { get; set; } = null!;
    public string CategoryName { get; set; } = "General";
    public string? Author { get; set; }
    public string PublishedDate { get; set; } = null!;
    public int ReadTime { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPublished { get; set; }
}

public class UpsertBlogRequest
{
    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? TitleGujarati { get; set; }
    [StringLength(300)] public string? Slug { get; set; }
    [StringLength(1000)] public string? FeaturedImage { get; set; }
    [StringLength(500)] public string? OfficialNotificationUrl { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(2000)]
    public string Excerpt { get; set; } = null!;

    [Required(AllowEmptyStrings = false), StringLength(200000)]
    public string Content { get; set; } = null!;

    [StringLength(200000)] public string? ContentGujarati { get; set; }
    [Range(1, int.MaxValue)] public int? CategoryId { get; set; }
    [StringLength(500)] public string? Tags { get; set; }
    [StringLength(150)] public string? Author { get; set; }
    public DateTime PublishedDate { get; set; } = DateTime.UtcNow;
    [Range(0, 600)] public int ReadTime { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPublished { get; set; } = true;
    [StringLength(300)] public string? MetaTitle { get; set; }
    [StringLength(500)] public string? MetaDescription { get; set; }
    [StringLength(500)] public string? MetaKeywords { get; set; }
    public bool IsActive { get; set; } = true;
}
