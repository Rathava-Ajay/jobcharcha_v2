namespace JobPortal.Application.DTOs.Auth;

public class UserProfileDto
{
    public string Id { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string Role { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyLogo { get; set; }
    public bool? IsCompanyVerified { get; set; }
    public decimal WalletBalance { get; set; }
    public int UnlockedResumesCount { get; set; }
    public string? ReferralCode { get; set; }
    public int ReferralsCount { get; set; }
    public string? ResumeUrl { get; set; }
    public int? ProfileScore { get; set; }
    public string? Education { get; set; }
    public List<string>? Skills { get; set; }
    public string Status { get; set; } = "Active";
    public bool EmailConfirmed { get; set; }

    /// <summary>True for an aspirant whose Career Hub profile has never been completed — the app
    /// routes them through the required-fields setup before letting them use the dashboard.</summary>
    public bool NeedsProfileSetup { get; set; }
}
