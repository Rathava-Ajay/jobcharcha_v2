using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("DailyQuizId", "GuestKey", Name = "IX_DailyQuizAttempts_DailyQuizId_GuestKey")]
[Index("DailyQuizId", "UserId", Name = "IX_DailyQuizAttempts_DailyQuizId_UserId")]
[Index("UserId", Name = "IX_DailyQuizAttempts_UserId")]
public partial class DailyQuizAttempt
{
    [Key]
    public int Id { get; set; }

    public int DailyQuizId { get; set; }

    public string? UserId { get; set; }

    [StringLength(64)]
    public string? GuestKey { get; set; }

    public int CorrectCount { get; set; }

    public int TotalQuestions { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal ScorePercent { get; set; }

    public string AnswersJson { get; set; } = null!;

    public DateTime CompletedAt { get; set; }

    [ForeignKey("DailyQuizId")]
    [InverseProperty("DailyQuizAttempts")]
    public virtual DailyQuiz DailyQuiz { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("DailyQuizAttempts")]
    public virtual AspNetUser? User { get; set; }
}
