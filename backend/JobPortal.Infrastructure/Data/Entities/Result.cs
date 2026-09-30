using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_Results_CategoryId")]
[Index("CreatedById", Name = "IX_Results_CreatedById")]
public partial class Result
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public int? CategoryId { get; set; }

    public string OrganizationName { get; set; } = null!;

    public string? ExamName { get; set; }

    public DateTime ResultDate { get; set; }

    public string? ResultLink { get; set; }

    public string? ResultPdf { get; set; }

    public int Views { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    public string CreatedById { get; set; } = null!;

    public string? CutOffMarks { get; set; }

    public string? Description { get; set; }

    public DateTime? ExamDate { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaDescription { get; set; }

    public string? MetaKeywords { get; set; }

    public string? MetaTitle { get; set; }

    public string? OrganizationLogo { get; set; }

    public string? SelectedCandidates { get; set; }

    public string? TitleGujarati { get; set; }

    public string? District { get; set; }

    public string State { get; set; } = null!;

    public int Status { get; set; }

    public string? ShortDescription { get; set; }

    [StringLength(300)]
    public string? FocusKeyword { get; set; }

    public string? SecondaryKeywordsJson { get; set; }

    public string? LsiKeywordsJson { get; set; }

    public string? FaqSchemaJson { get; set; }

    public string? InternalLinkAnchorsJson { get; set; }

    public string? CutOffBreakdownJson { get; set; }

    [StringLength(300)]
    public string? OgTitle { get; set; }

    [StringLength(500)]
    public string? OgDescription { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("Results")]
    public virtual Category? Category { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("Results")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
