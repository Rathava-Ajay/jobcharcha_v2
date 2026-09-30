using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CreatedById", Name = "IX_GovtSchemes_CreatedById")]
[Index("Slug", Name = "IX_GovtSchemes_Slug", IsUnique = true)]
public partial class GovtScheme
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string? TitleGujarati { get; set; }

    public string Slug { get; set; } = null!;

    public string Ministry { get; set; } = null!;

    [StringLength(100)]
    public string Category { get; set; } = null!;

    public string Eligibility { get; set; } = null!;

    public string Benefits { get; set; } = null!;

    public string? Description { get; set; }

    public string ApplyLink { get; set; } = null!;

    [StringLength(500)]
    public string? OfficialNotificationUrl { get; set; }

    public bool IsFeatured { get; set; }

    public int DisplayOrder { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("GovtSchemes")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
