using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("Difficulty", Name = "IX_Questions_Difficulty")]
[Index("ExamId", Name = "IX_Questions_ExamId")]
[Index("SectionId", Name = "IX_Questions_SectionId")]
[Index("Subject", "Topic", Name = "IX_Questions_Subject_Topic")]
[Index("TestId", Name = "IX_Questions_TestId")]
public partial class Question
{
    [Key]
    public int Id { get; set; }

    public int ExamId { get; set; }

    public int? TestId { get; set; }

    public int? SectionId { get; set; }

    [StringLength(100)]
    public string Subject { get; set; } = null!;

    [StringLength(150)]
    public string? Topic { get; set; }

    public int Difficulty { get; set; }

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

    [Column(TypeName = "decimal(5, 2)")]
    public decimal Marks { get; set; }

    public int DisplayOrder { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("ExamId")]
    [InverseProperty("Questions")]
    public virtual Exam Exam { get; set; } = null!;

    [InverseProperty("Question")]
    public virtual ICollection<Response> Responses { get; set; } = new List<Response>();

    [ForeignKey("SectionId")]
    [InverseProperty("Questions")]
    public virtual TestSection? Section { get; set; }

    [ForeignKey("TestId")]
    [InverseProperty("Questions")]
    public virtual Test? Test { get; set; }
}
