using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("IsRead", Name = "IX_InAppNotifications_IsRead")]
[Index("UserId", Name = "IX_InAppNotifications_UserId")]
public partial class InAppNotification
{
    [Key]
    public Guid Id { get; set; }

    public string UserId { get; set; } = null!;

    [StringLength(200)]
    public string? Title { get; set; }

    public string? Message { get; set; }

    [StringLength(50)]
    public string? Type { get; set; }

    [StringLength(100)]
    public string? ReferenceId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("InAppNotifications")]
    public virtual AspNetUser User { get; set; } = null!;
}
