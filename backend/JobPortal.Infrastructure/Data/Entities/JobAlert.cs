using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("UserId", Name = "IX_JobAlerts_UserId")]
public partial class JobAlert
{
    [Key]
    public Guid Id { get; set; }

    public string UserId { get; set; } = null!;

    [StringLength(200)]
    public string? Keyword { get; set; }

    [StringLength(100)]
    public string? Location { get; set; }

    [StringLength(100)]
    public string? Category { get; set; }

    [StringLength(50)]
    public string? JobType { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal? MinSalary { get; set; }

    public string? ExperienceLevel { get; set; }

    [StringLength(20)]
    public string Frequency { get; set; } = null!;

    public bool IsActive { get; set; }

    public DateTime? LastTriggeredAt { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("JobAlerts")]
    public virtual AspNetUser User { get; set; } = null!;
}
