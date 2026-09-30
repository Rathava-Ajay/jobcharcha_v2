using System.ComponentModel.DataAnnotations;
using JobPortal.Application.Common;

namespace JobPortal.Application.DTOs.Auth;

public class RegisterRequest
{
    [Required, StringLength(50, MinimumLength = 2)]
    [RegularExpression(ValidationPatterns.PersonNamePattern, ErrorMessage = ValidationPatterns.PersonNameErrorMessage)]
    public string FirstName { get; set; } = null!;

    [Required, StringLength(50, MinimumLength = 2)]
    [RegularExpression(ValidationPatterns.PersonNamePattern, ErrorMessage = ValidationPatterns.PersonNameErrorMessage)]
    public string LastName { get; set; } = null!;

    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    [Required, MinLength(8)]
    public string Password { get; set; } = null!;

    public string? Phone { get; set; }

    [Required]
    public string Role { get; set; } = "aspirant"; // aspirant | employer

    public string? CompanyName { get; set; }

    /// <summary>Required true when Role == "employer" — must accept the current employer terms before an account is created.</summary>
    public bool AcknowledgedTerms { get; set; }

    /// <summary>Attribution captured from the join deep link (?ref= / ?utm_source=), e.g. "instagram".</summary>
    [StringLength(60)]
    public string? Source { get; set; }

    /// <summary>Campaign tag from the join deep link (?utm_campaign=), e.g. "ig-2026-10".</summary>
    [StringLength(120)]
    public string? Campaign { get; set; }
}

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;

    [Required]
    public string Role { get; set; } = "aspirant"; // which role tile the user logged in from
}

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = null!;
}

public class ForgotPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = null!;
}

public class ResetPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    public string Token { get; set; } = null!;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = null!;
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = null!;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = null!;
}

public class ConfirmEmailRequest
{
    [Required]
    public string UserId { get; set; } = null!;

    [Required]
    public string Token { get; set; } = null!;
}

public class ResendConfirmationRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = null!;
}

public class UpdateProfileRequest
{
    [StringLength(50, MinimumLength = 2)]
    [RegularExpression(ValidationPatterns.PersonNamePattern, ErrorMessage = ValidationPatterns.PersonNameErrorMessage)]
    public string? FirstName { get; set; }

    [StringLength(50, MinimumLength = 2)]
    [RegularExpression(ValidationPatterns.PersonNamePattern, ErrorMessage = ValidationPatterns.PersonNameErrorMessage)]
    public string? LastName { get; set; }

    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string? Education { get; set; }
    public List<string>? Skills { get; set; }
}
