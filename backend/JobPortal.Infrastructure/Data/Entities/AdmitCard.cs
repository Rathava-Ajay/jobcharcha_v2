using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_AdmitCards_CategoryId")]
[Index("CreatedById", Name = "IX_AdmitCards_CreatedById")]
public partial class AdmitCard
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public int? CategoryId { get; set; }

    public string OrganizationName { get; set; } = null!;

    public string? ExamName { get; set; }

    public DateTime AdmitCardReleaseDate { get; set; }

    public DateTime? ExamDate { get; set; }

    public string? DownloadLink { get; set; }

    public int Views { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    public string? AdmitCardPdf { get; set; }

    public string CreatedById { get; set; } = null!;

    public string? Description { get; set; }

    public int DownloadCount { get; set; }

    public string? ImportantNotes { get; set; }

    public string? Instructions { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaDescription { get; set; }

    public string? MetaKeywords { get; set; }

    public string? MetaTitle { get; set; }

    public string? OrganizationLogo { get; set; }

    public string? TitleGujarati { get; set; }

    public string? District { get; set; }

    public string State { get; set; } = null!;

    public int Status { get; set; }

    public string? HowToDownload { get; set; }

    public string? PostName { get; set; }

    public int? Year { get; set; }

    public string? ShortDescription { get; set; }

    [StringLength(300)]
    public string? FocusKeyword { get; set; }

    public string? SecondaryKeywordsJson { get; set; }

    public string? LsiKeywordsJson { get; set; }

    public string? FaqSchemaJson { get; set; }

    public string? InternalLinkAnchorsJson { get; set; }

    [StringLength(300)]
    public string? OgTitle { get; set; }

    [StringLength(500)]
    public string? OgDescription { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("AdmitCards")]
    public virtual Category? Category { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("AdmitCards")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
