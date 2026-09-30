using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("AlertPreferenceId", "JobId", Name = "IX_AlertDispatchLogs_AlertPreferenceId_JobId", IsUnique = true)]
public partial class AlertDispatchLog
{
    [Key]
    public int Id { get; set; }

    public int AlertPreferenceId { get; set; }

    public int JobId { get; set; }

    public DateTime SentAt { get; set; }

    [ForeignKey("AlertPreferenceId")]
    public virtual AlertPreference AlertPreference { get; set; } = null!;

    [ForeignKey("JobId")]
    public virtual Job Job { get; set; } = null!;
}
