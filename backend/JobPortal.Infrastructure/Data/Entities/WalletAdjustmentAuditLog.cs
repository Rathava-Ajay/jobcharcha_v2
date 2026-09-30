using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>
/// Immutable record of every admin-initiated wallet credit/debit — nothing in this codebase ever
/// updates or deletes a row here (no service method exists to do so); it exists purely as a
/// compliance/security trail separate from WalletTransaction, which is the balance ledger. Mirrors
/// EmployerContactLog's role for the employer contact-unlock audit trail. AdminUserId/TargetUserId
/// are plain unconfigured string columns, not EF relationships — matches this codebase's existing
/// convention for audit-actor columns (see Job.ApprovedById/UpdatedById) rather than adding a
/// second AspNetUser navigation collection for every actor-id column.
/// </summary>
[Index("AdminUserId", Name = "IX_WalletAdjustmentAuditLogs_AdminUserId")]
[Index("TargetUserId", Name = "IX_WalletAdjustmentAuditLogs_TargetUserId")]
[Index("CreatedDate", Name = "IX_WalletAdjustmentAuditLogs_CreatedDate")]
public partial class WalletAdjustmentAuditLog
{
    [Key]
    public int Id { get; set; }

    [StringLength(450)]
    public string AdminUserId { get; set; } = null!;

    [StringLength(450)]
    public string TargetUserId { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Amount { get; set; }

    [StringLength(1000)]
    public string Reason { get; set; } = null!;

    [StringLength(64)]
    public string? IpAddress { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal BalanceAfter { get; set; }

    public DateTime CreatedDate { get; set; }
}
