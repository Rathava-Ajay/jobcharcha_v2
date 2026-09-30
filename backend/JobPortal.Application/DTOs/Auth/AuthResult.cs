namespace JobPortal.Application.DTOs.Auth;

public class AuthResult
{
    public string AccessToken { get; set; } = null!;
    public string RefreshToken { get; set; } = null!;
    public long ExpiresAt { get; set; }
    public UserProfileDto User { get; set; } = null!;
}
