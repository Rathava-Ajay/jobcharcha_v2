using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_AnswerKeys_CategoryId")]
[Index("CreatedById", Name = "IX_AnswerKeys_CreatedById")]
[Index("Slug", Name = "IX_AnswerKeys_Slug", IsUnique = true)]
public partial class AnswerKey
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string? TitleGujarati { get; set; }

    public string Slug { get; set; } = null!;

    public string OrganizationName { get; set; } = null!;

    public string? OrganizationLogo { get; set; }

    public string ExamName { get; set; } = null!;

    public int? CategoryId { get; set; }

    public string? Description { get; set; }

    public DateTime ExamDate { get; set; }

    public DateTime PublishedDate { get; set; }

    public string AnswerKeyLink { get; set; } = null!;

    public string? AnswerKeyPdf { get; set; }

    public string? OfficialWebsite { get; set; }

    public DateTime? ObjectionStartDate { get; set; }

    public DateTime? ObjectionEndDate { get; set; }

    public string? ObjectionLink { get; set; }

    public int Views { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string? MetaKeywords { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("AnswerKeys")]
    public virtual Category? Category { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("AnswerKeys")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
