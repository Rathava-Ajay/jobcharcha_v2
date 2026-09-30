using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EmployerProfileId", Name = "IX_EmployerCredits_EmployerProfileId", IsUnique = true)]
public partial class EmployerCredits
{
    [Key]
    public int Id { get; set; }

    public int EmployerProfileId { get; set; }

    public int TotalCredits { get; set; }

    public int UsedCredits { get; set; }

    public bool IsUnlimited { get; set; }

    public DateTime? LowCreditNotifiedAt { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    [NotMapped]
    public int CreditsRemaining => IsUnlimited ? int.MaxValue : TotalCredits - UsedCredits;

    [ForeignKey("EmployerProfileId")]
    [InverseProperty("EmployerCredits")]
    public virtual EmployerProfile EmployerProfile { get; set; } = null!;
}
