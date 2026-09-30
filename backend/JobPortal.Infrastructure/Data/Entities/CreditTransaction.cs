using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EmployerProfileId", Name = "IX_CreditTransactions_EmployerProfileId")]
public partial class CreditTransaction
{
    [Key]
    public int Id { get; set; }

    public int EmployerProfileId { get; set; }

    [StringLength(30)]
    public string Type { get; set; } = null!;

    public int Amount { get; set; }

    public int BalanceAfter { get; set; }

    public int? ReferenceId { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    public string? CreatedByUserId { get; set; }

    public DateTime CreatedDate { get; set; }

    [ForeignKey("EmployerProfileId")]
    [InverseProperty("CreditTransactions")]
    public virtual EmployerProfile EmployerProfile { get; set; } = null!;

    [ForeignKey("CreatedByUserId")]
    [InverseProperty("CreditTransactionsCreated")]
    public virtual AspNetUser? CreatedByUser { get; set; }
}
