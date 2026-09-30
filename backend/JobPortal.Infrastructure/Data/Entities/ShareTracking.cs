using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Table("ShareTracking")]
[Index("ReferralTrackingId", Name = "IX_ShareTracking_ReferralTrackingId")]
public partial class ShareTracking
{
    [Key]
    public int Id { get; set; }

    public int ReferralTrackingId { get; set; }

    [StringLength(50)]
    public string Platform { get; set; } = null!;

    public DateTime ShareDate { get; set; }

    [Column("IPAddress")]
    [StringLength(50)]
    public string Ipaddress { get; set; } = null!;

    [ForeignKey("ReferralTrackingId")]
    [InverseProperty("ShareTrackings")]
    public virtual ReferralTracking ReferralTracking { get; set; } = null!;
}
