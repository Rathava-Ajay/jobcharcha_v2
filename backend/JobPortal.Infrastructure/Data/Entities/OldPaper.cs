using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_OldPapers_CategoryId")]
[Index("CreatedById", Name = "IX_OldPapers_CreatedById")]
[Index("Slug", Name = "IX_OldPapers_Slug", IsUnique = true)]
public partial class OldPaper
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string? TitleGujarati { get; set; }

    public string Slug { get; set; } = null!;

    public string ExamName { get; set; } = null!;

    public int? CategoryId { get; set; }

    public int Year { get; set; }

    public string? Description { get; set; }

    public string PaperPdfLink { get; set; } = null!;

    public string? SolutionPdfLink { get; set; }

    public int? TotalQuestions { get; set; }

    public int? TotalMarks { get; set; }

    public int? Duration { get; set; }

    public string? Subject { get; set; }

    public string? PaperType { get; set; }

    public int Downloads { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string? MetaKeywords { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("OldPapers")]
    public virtual Category? Category { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("OldPapers")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
