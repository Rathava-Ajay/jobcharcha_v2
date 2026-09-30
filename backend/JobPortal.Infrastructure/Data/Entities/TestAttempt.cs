using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("MockTestId", Name = "IX_TestAttempts_MockTestId")]
[Index("UserId", Name = "IX_TestAttempts_UserId")]
public partial class TestAttempt
{
    [Key]
    public int Id { get; set; }

    public int MockTestId { get; set; }

    public string? UserId { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public int TimeTakenSeconds { get; set; }

    public int TotalQuestions { get; set; }

    public int AttemptedQuestions { get; set; }

    public int CorrectAnswers { get; set; }

    public int WrongAnswers { get; set; }

    public int SkippedQuestions { get; set; }

    [Column(TypeName = "decimal(7, 2)")]
    public decimal Score { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal Percentage { get; set; }

    public string Grade { get; set; } = null!;

    public string? AnswersJson { get; set; }

    public bool IsCompleted { get; set; }

    [ForeignKey("MockTestId")]
    [InverseProperty("TestAttempts")]
    public virtual MockTest MockTest { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("TestAttempts")]
    public virtual AspNetUser? User { get; set; }
}
