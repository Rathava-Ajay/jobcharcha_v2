namespace JobPortal.Application.DTOs.Users;

public class UserAdminListItemDto
{
    public string Id { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = null!;
    public bool IsActive { get; set; }
    public bool IsPremium { get; set; }
    public bool IsEmailVerified { get; set; }
    public string CreatedDate { get; set; } = null!;
    public string? LastLoginDate { get; set; }

    /// <summary>Attribution captured at signup (e.g. "instagram"); null for organic signups.</summary>
    public string? SignupSource { get; set; }
    public string? SignupCampaign { get; set; }

    /// <summary>Set only for employer accounts — the EmployerProfile id and whether an admin has
    /// approved that company to post live jobs. Null for non-employer users.</summary>
    public int? EmployerProfileId { get; set; }
    public bool? IsEmployerApproved { get; set; }
}

public class SetUserActiveRequest
{
    public bool IsActive { get; set; }
}

public class SetEmployerApprovalRequest
{
    public bool Approved { get; set; }
}
