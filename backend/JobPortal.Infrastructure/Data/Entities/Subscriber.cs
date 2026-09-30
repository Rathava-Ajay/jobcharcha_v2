using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("Email", Name = "IX_Subscribers_Email", IsUnique = true)]
public partial class Subscriber
{
    [Key]
    public int Id { get; set; }

    public string Email { get; set; } = null!;

    public DateTime? VerifiedAt { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    public bool IsVerified { get; set; }

    public string? Name { get; set; }

    public string? Phone { get; set; }

    public string? Preferences { get; set; }

    public string? Source { get; set; }

    public string? VerificationToken { get; set; }
}
