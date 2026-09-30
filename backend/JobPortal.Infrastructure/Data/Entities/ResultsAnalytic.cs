using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("AttemptId", Name = "IX_ResultsAnalytics_AttemptId", IsUnique = true)]
[Index("TestId", "Score", Name = "IX_ResultsAnalytics_TestId_Score")]
[Index("UserId", Name = "IX_ResultsAnalytics_UserId")]
public partial class ResultsAnalytic
{
    [Key]
    public int Id { get; set; }

    public int AttemptId { get; set; }

    public string UserId { get; set; } = null!;

    public int TestId { get; set; }

    [Column(TypeName = "decimal(8, 2)")]
    public decimal Score { get; set; }

    [Column(TypeName = "decimal(8, 2)")]
    public decimal MaxScore { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal AccuracyPercent { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal Percentile { get; set; }

    public int AllIndiaRank { get; set; }

    public int CorrectCount { get; set; }

    public int WrongCount { get; set; }

    public int UnansweredCount { get; set; }

    public int TotalTimeSeconds { get; set; }

    public string? SectionalBreakdownJson { get; set; }

    public string? WeakTopicsJson { get; set; }

    public string? TimePerQuestionJson { get; set; }

    public DateTime ComputedAt { get; set; }

    [ForeignKey("AttemptId")]
    [InverseProperty("ResultsAnalytic")]
    public virtual Attempt Attempt { get; set; } = null!;

    [ForeignKey("TestId")]
    [InverseProperty("ResultsAnalytics")]
    public virtual Test Test { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("ResultsAnalytics")]
    public virtual AspNetUser User { get; set; } = null!;
}
