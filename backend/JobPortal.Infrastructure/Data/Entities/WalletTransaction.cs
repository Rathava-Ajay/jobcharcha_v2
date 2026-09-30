using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("UserId", Name = "IX_WalletTransactions_UserId")]
public partial class WalletTransaction
{
    [Key]
    public Guid Id { get; set; }

    public string UserId { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Amount { get; set; }

    [StringLength(20)]
    public string? Type { get; set; }

    [StringLength(300)]
    public string? Description { get; set; }

    [StringLength(100)]
    public string? ReferenceId { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("WalletTransactions")]
    public virtual AspNetUser User { get; set; } = null!;
}
