using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("SnapshotDate", Name = "IX_SocialGrowthMetrics_SnapshotDate", IsUnique = true)]
public partial class SocialGrowthMetric
{
    [Key]
    public int Id { get; set; }

    public DateTime SnapshotDate { get; set; }

    public int WhatsAppMembers { get; set; }

    public int TelegramMembers { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [StringLength(450)]
    public string? RecordedById { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }
}
