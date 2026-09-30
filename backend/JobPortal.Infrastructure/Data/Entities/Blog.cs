using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_Blogs_CategoryId")]
[Index("CreatedById", Name = "IX_Blogs_CreatedById")]
[Index("Slug", Name = "IX_Blogs_Slug", IsUnique = true)]
public partial class Blog
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string? TitleGujarati { get; set; }

    public string Slug { get; set; } = null!;

    public string? FeaturedImage { get; set; }

    [StringLength(500)]
    public string? OfficialNotificationUrl { get; set; }

    public string Excerpt { get; set; } = null!;

    public string Content { get; set; } = null!;

    public string? ContentGujarati { get; set; }

    public int? CategoryId { get; set; }

    public string? Tags { get; set; }

    public string? Author { get; set; }

    public DateTime PublishedDate { get; set; }

    public int Views { get; set; }

    public int ReadTime { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsPublished { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string? MetaKeywords { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("Blogs")]
    public virtual Category? Category { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("Blogs")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
