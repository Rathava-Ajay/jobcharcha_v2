using System.Security.Claims;
using JobPortal.Application.DTOs.Auth;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IFileStorageService _fileStorage;

    public AuthController(IAuthService authService, IFileStorageService fileStorage)
    {
        _authService = authService;
        _fileStorage = fileStorage;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return result.Succeeded ? Ok(result.Data) : Unauthorized(new { result.ErrorCode, result.Error });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest request)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken);
        return result.Succeeded ? Ok(result.Data) : Unauthorized(new { result.ErrorCode, result.Error });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _authService.LogoutAsync(UserId);
        return NoContent();
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        await _authService.ForgotPasswordAsync(request);
        return Ok(new { message = "If an account exists for this email, a reset code has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var result = await _authService.ResetPasswordAsync(request);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var result = await _authService.ChangePasswordAsync(UserId, request);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail(ConfirmEmailRequest request)
    {
        var result = await _authService.ConfirmEmailAsync(request);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("resend-confirmation")]
    public async Task<IActionResult> ResendConfirmation(ResendConfirmationRequest request)
    {
        await _authService.ResendConfirmationAsync(request);
        return Ok(new { message = "If an account exists for this email, a confirmation code has been sent." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var result = await _authService.GetProfileAsync(UserId);
        return result.Succeeded ? Ok(result.Data) : NotFound();
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest request)
    {
        var result = await _authService.UpdateProfileAsync(UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize]
    [HttpPost("me/avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file.Length == 0) return BadRequest("No file uploaded.");
        await using var stream = file.OpenReadStream();
        var url = await _fileStorage.SaveAsync(stream, file.FileName, file.ContentType, "avatars");
        var result = await _authService.UpdateAvatarUrlAsync(UserId, url);
        return Ok(new { url = result.Data });
    }

    [Authorize]
    [HttpPost("me/resume")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> UploadResume(IFormFile file)
    {
        if (file.Length == 0) return BadRequest("No file uploaded.");
        await using var stream = file.OpenReadStream();
        var url = await _fileStorage.SaveAsync(stream, file.FileName, file.ContentType, "resumes");
        var result = await _authService.UpdateResumeUrlAsync(UserId, url);
        return Ok(new { url = result.Data });
    }
}
