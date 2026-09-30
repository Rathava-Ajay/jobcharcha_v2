using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

/// <summary>Admin moderation of first-time employer job postings (Status = PendingReview).</summary>
[ApiController]
[Route("api/admin/employer-jobs")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class AdminEmployerJobsController : ControllerBase
{
    private readonly IEmployerJobService _jobService;

    public AdminEmployerJobsController(IEmployerJobService jobService)
    {
        _jobService = jobService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending() => Ok(await _jobService.GetPendingReviewAsync());

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var result = await _jobService.ApproveAsync(id, UserId);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, RejectEmployerJobRequest request)
    {
        var result = await _jobService.RejectAsync(id, UserId, request.Reason);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
