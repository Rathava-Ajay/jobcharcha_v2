using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ExamId", Name = "IX_HistoricalCutoffs_ExamId")]
[Index("ExamName", "Year", "Category", Name = "IX_HistoricalCutoffs_ExamName_Year_Category")]
public partial class HistoricalCutoff
{
    [Key]
    public int Id { get; set; }

    public int? ExamId { get; set; }

    [StringLength(200)]
    public string ExamName { get; set; } = null!;

    [StringLength(100)]
    public string? Category { get; set; }

    public int Year { get; set; }

    [Column(TypeName = "decimal(8, 2)")]
    public decimal CutoffScore { get; set; }

    [Column(TypeName = "decimal(8, 2)")]
    public decimal MaxScore { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("ExamId")]
    [InverseProperty("HistoricalCutoffs")]
    public virtual Exam? Exam { get; set; }
}
