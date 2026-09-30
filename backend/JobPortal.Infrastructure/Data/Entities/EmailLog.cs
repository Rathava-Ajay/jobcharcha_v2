using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CreatedDate", Name = "IX_EmailLogs_CreatedDate")]
[Index("IsSent", Name = "IX_EmailLogs_IsSent")]
[Index("OrderId", Name = "IX_EmailLogs_OrderId")]
public partial class EmailLog
{
    [Key]
    public int EmailLogId { get; set; }

    public int? OrderId { get; set; }

    [StringLength(200)]
    public string ToEmail { get; set; } = null!;

    [StringLength(200)]
    public string? Subject { get; set; }

    [StringLength(50)]
    public string? EmailType { get; set; }

    public bool IsSent { get; set; }

    public DateTime? SentDate { get; set; }

    [StringLength(500)]
    public string? ErrorMessage { get; set; }

    public DateTime CreatedDate { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("EmailLogs")]
    public virtual Order? Order { get; set; }
}
