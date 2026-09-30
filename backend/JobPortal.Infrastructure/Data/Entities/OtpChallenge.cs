using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("Identifier", "IsConsumed", "ExpiresAt", Name = "IX_OtpChallenges_Identifier_IsConsumed_ExpiresAt")]
public partial class OtpChallenge
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string Identifier { get; set; } = null!;

    [StringLength(20)]
    public string Channel { get; set; } = null!;

    [StringLength(128)]
    public string CodeHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public int AttemptCount { get; set; }

    public bool IsConsumed { get; set; }

    [StringLength(64)]
    public string? IpAddress { get; set; }
}
