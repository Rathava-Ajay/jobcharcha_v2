using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("UserId", Name = "IX_WalletCredits_UserId", IsUnique = true)]
public partial class WalletCredit
{
    [Key]
    public Guid Id { get; set; }

    public string UserId { get; set; } = null!;

    [Column("BalanceINR", TypeName = "decimal(10, 2)")]
    public decimal BalanceInr { get; set; }

    public DateTime UpdatedAt { get; set; }

    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("WalletCredit")]
    public virtual AspNetUser User { get; set; } = null!;
}
