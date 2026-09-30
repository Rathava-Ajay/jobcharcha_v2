using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Table("ConversionTracking")]
[Index("ConversionDate", Name = "IX_ConversionTracking_ConversionDate")]
[Index("ConversionType", Name = "IX_ConversionTracking_ConversionType")]
public partial class ConversionTracking
{
    [Key]
    public int Id { get; set; }

    [StringLength(50)]
    public string ConversionType { get; set; } = null!;

    [StringLength(255)]
    public string? UserId { get; set; }

    [StringLength(255)]
    public string? UserEmail { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Value { get; set; }

    [StringLength(50)]
    public string ReferralCode { get; set; } = null!;

    public DateTime ConversionDate { get; set; }

    [Column("IPAddress")]
    [StringLength(50)]
    public string Ipaddress { get; set; } = null!;

    [StringLength(500)]
    public string UserAgent { get; set; } = null!;

    [StringLength(500)]
    public string PageUrl { get; set; } = null!;
}
