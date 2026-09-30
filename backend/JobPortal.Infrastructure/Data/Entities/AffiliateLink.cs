using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("Category", Name = "IX_AffiliateLinks_Category")]
[Index("IsActive", Name = "IX_AffiliateLinks_IsActive")]
[Index("IsActive", "Category", "DisplayOrder", Name = "IX_AffiliateLinks_IsActive_Category_DisplayOrder")]
public partial class AffiliateLink
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string Title { get; set; } = null!;

    [StringLength(500)]
    public string Description { get; set; } = null!;

    [StringLength(500)]
    public string Url { get; set; } = null!;

    [StringLength(500)]
    public string? ImageUrl { get; set; }

    [StringLength(50)]
    public string Category { get; set; } = null!;

    [StringLength(30)]
    public string? BadgeText { get; set; }

    public int DisplayOrder { get; set; }

    public int ClickCount { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }
}
