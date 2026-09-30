using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_News_CategoryId")]
[Index("CreatedById", Name = "IX_News_CreatedById")]
[Index("Slug", Name = "IX_News_Slug", IsUnique = true)]
public partial class News
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string? TitleGujarati { get; set; }

    public string Slug { get; set; } = null!;

    public string? FeaturedImage { get; set; }

    public string Summary { get; set; } = null!;

    public string Content { get; set; } = null!;

    public string? ContentGujarati { get; set; }

    public int? CategoryId { get; set; }

    public string? Source { get; set; }

    public string? SourceLink { get; set; }

    public DateTime PublishedDate { get; set; }

    public int Views { get; set; }

    public bool IsBreaking { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string? MetaKeywords { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("News")]
    public virtual Category? Category { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("News")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
