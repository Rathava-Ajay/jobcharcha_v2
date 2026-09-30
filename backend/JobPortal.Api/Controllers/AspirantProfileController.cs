using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Aspirant;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/aspirant/profile")]
[Authorize(Roles = AppRoles.JobSeeker)]
public class AspirantProfileController : ControllerBase
{
    private readonly IAspirantProfileService _service;

    public AspirantProfileController(IAspirantProfileService service) => _service = service;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var result = await _service.GetAsync(UserId);
        return result.Succeeded ? Ok(result.Data) : NotFound(new { result.ErrorCode, result.Error });
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpsertAspirantProfileRequest request)
    {
        var result = await _service.UpsertAsync(UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpDelete("resume")]
    public async Task<IActionResult> DeleteResume()
    {
        var result = await _service.DeleteResumeAsync(UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
