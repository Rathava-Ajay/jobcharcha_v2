using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_Posts_CategoryId")]
[Index("CreatedById", Name = "IX_Posts_CreatedById")]
[Index("Slug", Name = "IX_Posts_Slug", IsUnique = true)]
public partial class Post
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string Content { get; set; } = null!;

    public string Excerpt { get; set; } = null!;

    public int CategoryId { get; set; }

    public string? FeaturedImage { get; set; }

    public int Views { get; set; }

    public bool IsPublished { get; set; }

    public DateTime? PublishedDate { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("Posts")]
    public virtual Category Category { get; set; } = null!;

    [ForeignKey("CreatedById")]
    [InverseProperty("Posts")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
