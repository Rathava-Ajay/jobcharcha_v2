using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_Syllabuses_CategoryId")]
[Index("CreatedById", Name = "IX_Syllabuses_CreatedById")]
[Index("Slug", Name = "IX_Syllabuses_Slug", IsUnique = true)]
public partial class Syllabuse
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string? TitleGujarati { get; set; }

    public string Slug { get; set; } = null!;

    public string ExamName { get; set; } = null!;

    public int? CategoryId { get; set; }

    public string? Description { get; set; }

    public string SyllabusPdfLink { get; set; } = null!;

    public string? ExamPattern { get; set; }

    public string? ImportantTopics { get; set; }

    public int? TotalSubjects { get; set; }

    public int? TotalMarks { get; set; }

    public int? Duration { get; set; }

    public string? ExamMode { get; set; }

    public string? NegativeMarking { get; set; }

    public int Views { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string? MetaKeywords { get; set; }

    public string CreatedById { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    public string? OrganizationName { get; set; }

    public DateTime? PublishDate { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("Syllabuses")]
    public virtual Category? Category { get; set; }

    [ForeignKey("CreatedById")]
    [InverseProperty("Syllabuses")]
    public virtual AspNetUser CreatedBy { get; set; } = null!;
}
