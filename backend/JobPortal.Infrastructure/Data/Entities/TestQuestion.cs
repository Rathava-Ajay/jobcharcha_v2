using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("MockTestId", Name = "IX_TestQuestions_MockTestId")]
public partial class TestQuestion
{
    [Key]
    public int Id { get; set; }

    public int MockTestId { get; set; }

    public int QuestionNumber { get; set; }

    public string QuestionText { get; set; } = null!;

    public string? QuestionImageUrl { get; set; }

    public string OptionA { get; set; } = null!;

    public string OptionB { get; set; } = null!;

    public string OptionC { get; set; } = null!;

    public string OptionD { get; set; } = null!;

    public string CorrectAnswer { get; set; } = null!;

    public string? Explanation { get; set; }

    public string? Topic { get; set; }

    public string Difficulty { get; set; } = null!;

    public int Marks { get; set; }

    [ForeignKey("MockTestId")]
    [InverseProperty("TestQuestions")]
    public virtual MockTest MockTest { get; set; } = null!;
}
