using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ReferralCode", Name = "IX_Referrals_ReferralCode")]
[Index("ReferralTrackingId", Name = "IX_Referrals_ReferralTrackingId")]
public partial class Referral
{
    [Key]
    public int Id { get; set; }

    public int ReferralTrackingId { get; set; }

    [StringLength(50)]
    public string ReferralCode { get; set; } = null!;

    [StringLength(100)]
    public string NewUserName { get; set; } = null!;

    [StringLength(100)]
    public string NewUserEmail { get; set; } = null!;

    [StringLength(15)]
    public string NewUserWhatsApp { get; set; } = null!;

    public bool IsVerified { get; set; }

    [StringLength(100)]
    public string VerificationToken { get; set; } = null!;

    public DateTime JoinedDate { get; set; }

    public DateTime? VerifiedDate { get; set; }

    [Column("IPAddress")]
    [StringLength(50)]
    public string Ipaddress { get; set; } = null!;

    [StringLength(500)]
    public string UserAgent { get; set; } = null!;

    public bool PurchaseRewardPaid { get; set; }

    [StringLength(450)]
    public string? ReferredUserId { get; set; }

    public bool SignupRewardPaid { get; set; }

    [ForeignKey("ReferralTrackingId")]
    [InverseProperty("Referrals")]
    public virtual ReferralTracking ReferralTracking { get; set; } = null!;
}
