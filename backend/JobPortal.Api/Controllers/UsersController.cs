using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Users;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin([FromQuery] string? search) =>
        Ok(await _userService.GetAllForAdminAsync(search));

    [HttpPut("admin/{id}/active")]
    public async Task<IActionResult> SetActive(string id, SetUserActiveRequest request)
    {
        var result = await _userService.SetActiveAsync(id, request.IsActive);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPut("admin/{id}/employer-approval")]
    public async Task<IActionResult> SetEmployerApproval(string id, SetEmployerApprovalRequest request)
    {
        var result = await _userService.SetEmployerApprovalAsync(id, request.Approved, UserId);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
