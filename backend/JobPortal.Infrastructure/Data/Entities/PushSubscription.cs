using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("Endpoint", Name = "IX_PushSubscriptions_Endpoint", IsUnique = true)]
[Index("UserId", Name = "IX_PushSubscriptions_UserId")]
public partial class PushSubscription
{
    [Key]
    public int Id { get; set; }

    public string? UserId { get; set; }

    [StringLength(500)]
    public string Endpoint { get; set; } = null!;

    [StringLength(200)]
    public string P256dh { get; set; } = null!;

    [StringLength(100)]
    public string Auth { get; set; } = null!;

    [StringLength(100)]
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LastUsedAt { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("PushSubscriptions")]
    public virtual AspNetUser? User { get; set; }
}
