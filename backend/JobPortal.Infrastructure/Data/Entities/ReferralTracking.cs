using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ReferrerCode", Name = "IX_ReferralTrackings_ReferrerCode", IsUnique = true)]
[Index("UserId", Name = "IX_ReferralTrackings_UserId")]
public partial class ReferralTracking
{
    [Key]
    public int Id { get; set; }

    [StringLength(50)]
    public string ReferrerCode { get; set; } = null!;

    [StringLength(100)]
    public string ReferrerName { get; set; } = null!;

    [StringLength(100)]
    public string ReferrerEmail { get; set; } = null!;

    [StringLength(15)]
    public string ReferrerWhatsApp { get; set; } = null!;

    public int TotalReferrals { get; set; }

    public int VerifiedReferrals { get; set; }

    public int RewardTier { get; set; }

    public DateTime? LastRewardClaimed { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime LastUpdated { get; set; }

    public bool IsActive { get; set; }

    public string? UserId { get; set; }

    [InverseProperty("ReferralTracking")]
    public virtual ICollection<Referral> Referrals { get; set; } = new List<Referral>();

    [InverseProperty("ReferralTracking")]
    public virtual ICollection<ShareTracking> ShareTrackings { get; set; } = new List<ShareTracking>();

    [ForeignKey("UserId")]
    [InverseProperty("ReferralTrackings")]
    public virtual AspNetUser? User { get; set; }
}
