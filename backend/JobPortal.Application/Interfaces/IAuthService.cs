using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Auth;

namespace JobPortal.Application.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<AuthResult>> RegisterAsync(RegisterRequest request);
    Task<ServiceResult<AuthResult>> LoginAsync(LoginRequest request);
    Task<ServiceResult<AuthResult>> RefreshAsync(string refreshToken);
    Task<ServiceResult> LogoutAsync(string userId);
    Task<ServiceResult> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request);
    Task<ServiceResult> ChangePasswordAsync(string userId, ChangePasswordRequest request);
    Task<ServiceResult> ConfirmEmailAsync(ConfirmEmailRequest request);
    Task<ServiceResult> ResendConfirmationAsync(ResendConfirmationRequest request);
    Task<ServiceResult<UserProfileDto>> GetProfileAsync(string userId);
    Task<ServiceResult<UserProfileDto>> UpdateProfileAsync(string userId, UpdateProfileRequest request);
    Task<ServiceResult<string>> UpdateAvatarUrlAsync(string userId, string url);
    Task<ServiceResult<string>> UpdateResumeUrlAsync(string userId, string url);
}
