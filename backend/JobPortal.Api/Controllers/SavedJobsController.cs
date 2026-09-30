using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Aspirant;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/saved-jobs")]
[Authorize(Roles = AppRoles.JobSeeker)]
public class SavedJobsController : ControllerBase
{
    private readonly ISavedJobService _service;

    public SavedJobsController(ISavedJobService service) => _service = service;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> GetMine() => Ok(await _service.GetMineAsync(UserId));

    [HttpGet("ids")]
    public async Task<IActionResult> GetMyIds() => Ok(await _service.GetMyIdsAsync(UserId));

    [HttpPost]
    public async Task<IActionResult> Save(SaveJobRequest request)
    {
        var result = await _service.SaveAsync(UserId, request.EmployerJobId);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpDelete("{employerJobId:int}")]
    public async Task<IActionResult> Unsave(int employerJobId)
    {
        var result = await _service.UnsaveAsync(UserId, employerJobId);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
