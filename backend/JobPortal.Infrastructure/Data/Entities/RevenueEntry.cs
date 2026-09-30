using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ReceivedAt", Name = "IX_RevenueEntries_ReceivedAt")]
[Index("Source", Name = "IX_RevenueEntries_Source")]
[Index("Source", "ReceivedAt", Name = "IX_RevenueEntries_Source_ReceivedAt")]
public partial class RevenueEntry
{
    [Key]
    public int Id { get; set; }

    [StringLength(50)]
    public string Source { get; set; } = null!;

    [Column(TypeName = "decimal(12, 2)")]
    public decimal Amount { get; set; }

    [StringLength(500)]
    public string Description { get; set; } = null!;

    [StringLength(200)]
    public string PayerName { get; set; } = null!;

    [StringLength(200)]
    public string PayerContact { get; set; } = null!;

    [StringLength(50)]
    public string PaymentMethod { get; set; } = null!;

    [StringLength(100)]
    public string TransactionId { get; set; } = null!;

    public DateTime ReceivedAt { get; set; }

    public bool IsVerified { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }
}
