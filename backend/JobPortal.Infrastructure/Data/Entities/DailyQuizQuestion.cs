using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("DailyQuizId", "DisplayOrder", Name = "IX_DailyQuizQuestions_DailyQuizId_DisplayOrder")]
public partial class DailyQuizQuestion
{
    [Key]
    public int Id { get; set; }

    public int DailyQuizId { get; set; }

    public int DisplayOrder { get; set; }

    [StringLength(150)]
    public string? Topic { get; set; }

    public string QuestionTextEn { get; set; } = null!;

    public string? QuestionTextGu { get; set; }

    [Column("OptionAEn")]
    [StringLength(1000)]
    public string OptionAen { get; set; } = null!;

    [Column("OptionAGu")]
    [StringLength(1000)]
    public string? OptionAgu { get; set; }

    [Column("OptionBEn")]
    [StringLength(1000)]
    public string OptionBen { get; set; } = null!;

    [Column("OptionBGu")]
    [StringLength(1000)]
    public string? OptionBgu { get; set; }

    [Column("OptionCEn")]
    [StringLength(1000)]
    public string OptionCen { get; set; } = null!;

    [Column("OptionCGu")]
    [StringLength(1000)]
    public string? OptionCgu { get; set; }

    [Column("OptionDEn")]
    [StringLength(1000)]
    public string OptionDen { get; set; } = null!;

    [Column("OptionDGu")]
    [StringLength(1000)]
    public string? OptionDgu { get; set; }

    [StringLength(1)]
    public string CorrectOption { get; set; } = null!;

    public string? ExplanationEn { get; set; }

    public string? ExplanationGu { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("DailyQuizId")]
    [InverseProperty("DailyQuizQuestions")]
    public virtual DailyQuiz DailyQuiz { get; set; } = null!;
}
