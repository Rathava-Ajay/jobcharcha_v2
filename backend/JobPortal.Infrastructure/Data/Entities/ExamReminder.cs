using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ExamEventId", Name = "IX_ExamReminders_ExamEventId")]
public partial class ExamReminder
{
    [Key]
    public int Id { get; set; }

    public int ExamEventId { get; set; }

    public string Email { get; set; } = null!;

    public string? Phone { get; set; }

    public string ReminderType { get; set; } = null!;

    public bool RemindOnApplicationStart { get; set; }

    public bool RemindOnApplicationEnd { get; set; }

    public bool RemindOnAdmitCard { get; set; }

    public bool RemindOnExamDate { get; set; }

    public bool RemindOnResult { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("ExamEventId")]
    [InverseProperty("ExamReminders")]
    public virtual ExamEvent ExamEvent { get; set; } = null!;
}
