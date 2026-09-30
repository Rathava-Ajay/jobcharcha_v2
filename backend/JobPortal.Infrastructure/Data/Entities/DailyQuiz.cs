using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("IsPublished", "IsActive", Name = "IX_DailyQuizzes_IsPublished_IsActive")]
[Index("QuizDate", Name = "IX_DailyQuizzes_QuizDate", IsUnique = true)]
public partial class DailyQuiz
{
    [Key]
    public int Id { get; set; }

    public DateOnly QuizDate { get; set; }

    [StringLength(250)]
    public string Title { get; set; } = null!;

    [StringLength(250)]
    public string? TitleGujarati { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(1000)]
    public string? DescriptionGujarati { get; set; }

    public bool IsPublished { get; set; }

    [StringLength(450)]
    public string? CreatedById { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [InverseProperty("DailyQuiz")]
    public virtual ICollection<DailyQuizAttempt> DailyQuizAttempts { get; set; } = new List<DailyQuizAttempt>();

    [InverseProperty("DailyQuiz")]
    public virtual ICollection<DailyQuizQuestion> DailyQuizQuestions { get; set; } = new List<DailyQuizQuestion>();
}
