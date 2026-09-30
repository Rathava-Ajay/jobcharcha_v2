using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class MockTest
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string? Description { get; set; }

    public string ExamCategory { get; set; } = null!;

    public string Subject { get; set; } = null!;

    public int TotalQuestions { get; set; }

    public int DurationMinutes { get; set; }

    public int TotalMarks { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal NegativeMarking { get; set; }

    public string Difficulty { get; set; } = null!;

    public bool IsFree { get; set; }

    public bool IsActive { get; set; }

    public int AttemptCount { get; set; }

    public DateTime CreatedAt { get; set; }

    [InverseProperty("MockTest")]
    public virtual ICollection<TestAttempt> TestAttempts { get; set; } = new List<TestAttempt>();

    [InverseProperty("MockTest")]
    public virtual ICollection<TestQuestion> TestQuestions { get; set; } = new List<TestQuestion>();
}
