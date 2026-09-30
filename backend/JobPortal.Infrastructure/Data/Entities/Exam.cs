using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_Exams_CategoryId")]
[Index("IsActive", Name = "IX_Exams_IsActive")]
[Index("Slug", Name = "IX_Exams_Slug", IsUnique = true)]
[Index("Status", Name = "IX_Exams_Status")]
public partial class Exam
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string Name { get; set; } = null!;

    [StringLength(200)]
    public string? NameGujarati { get; set; }

    [StringLength(250)]
    public string Slug { get; set; } = null!;

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(1000)]
    public string? DescriptionGujarati { get; set; }

    [StringLength(500)]
    public string? LogoUrl { get; set; }

    public int? CategoryId { get; set; }

    public int FreeTestsAllowed { get; set; }

    public int DisplayOrder { get; set; }

    public int Status { get; set; }

    [StringLength(200)]
    public string? MetaTitle { get; set; }

    [StringLength(500)]
    public string? MetaDescription { get; set; }

    [StringLength(450)]
    public string? CreatedById { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("Exams")]
    public virtual Category? Category { get; set; }

    [InverseProperty("Exam")]
    public virtual ICollection<HistoricalCutoff> HistoricalCutoffs { get; set; } = new List<HistoricalCutoff>();

    [InverseProperty("Exam")]
    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();

    [InverseProperty("Exam")]
    public virtual ICollection<Test> Tests { get; set; } = new List<Test>();
}
