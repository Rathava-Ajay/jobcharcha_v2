using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("AttemptId", "QuestionId", Name = "IX_Responses_AttemptId_QuestionId", IsUnique = true)]
[Index("QuestionId", Name = "IX_Responses_QuestionId")]
public partial class Response
{
    [Key]
    public int Id { get; set; }

    public int AttemptId { get; set; }

    public int QuestionId { get; set; }

    [StringLength(1)]
    public string? SelectedOption { get; set; }

    public bool IsMarkedForReview { get; set; }

    public bool IsVisited { get; set; }

    public int TimeSpentSeconds { get; set; }

    public DateTime? AnsweredAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("AttemptId")]
    [InverseProperty("Responses")]
    public virtual Attempt Attempt { get; set; } = null!;

    [ForeignKey("QuestionId")]
    [InverseProperty("Responses")]
    public virtual Question Question { get; set; } = null!;
}
