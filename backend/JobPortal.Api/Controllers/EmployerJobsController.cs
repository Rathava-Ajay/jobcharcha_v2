using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/employer/jobs")]
[EnableRateLimiting("search")]
public class EmployerJobsController : ControllerBase
{
    private readonly IEmployerContextService _context;
    private readonly IEmployerJobService _jobService;
    private readonly IJobApplicationService _applicationService;

    public EmployerJobsController(IEmployerContextService context, IEmployerJobService jobService, IJobApplicationService applicationService)
    {
        _context = context;
        _jobService = jobService;
        _applicationService = applicationService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<int?> ResolveEmployerAsync() => await _context.ResolveEmployerProfileIdAsync(UserId);

    // Public browsing — no auth required.

    [AllowAnonymous]
    [HttpGet("public")]
    [ResponseCache(Duration = 60)]
    public async Task<IActionResult> SearchPublic([FromQuery] string? search, [FromQuery] string? city, [FromQuery] string? jobType) =>
        Ok(await _jobService.SearchPublicAsync(search, city, jobType));

    // Not cached — the response includes hasApplied, which is specific to whoever's token
    // (if any) is on the request, so caching it would leak one visitor's applied-state to another.
    [AllowAnonymous]
    [HttpGet("public/{slug}")]
    public async Task<IActionResult> GetPublicBySlug(string slug)
    {
        var viewerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var job = await _jobService.GetPublicBySlugAsync(slug, viewerUserId);
        return job is null ? NotFound() : Ok(job);
    }

    // Employer-only management.

    [Authorize(Roles = AppRoles.Employer)]
    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        return Ok(await _jobService.GetMineAsync(employerProfileId.Value));
    }

    [Authorize(Roles = AppRoles.Employer)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var job = await _jobService.GetByIdForEmployerAsync(employerProfileId.Value, id);
        return job is null ? NotFound() : Ok(job);
    }

    [Authorize(Roles = AppRoles.Employer)]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertEmployerJobRequest request)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _jobService.CreateAsync(employerProfileId.Value, request);
        if (result.Succeeded) return Ok(result.Data);
        var body = new { result.ErrorCode, result.Error };
        return result.ErrorCode switch
        {
            "EmailNotVerified" => StatusCode(StatusCodes.Status403Forbidden, body),
            "DuplicatePosting" => Conflict(body),
            _ => BadRequest(body),
        };
    }

    [Authorize(Roles = AppRoles.Employer)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertEmployerJobRequest request)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _jobService.UpdateAsync(employerProfileId.Value, id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = AppRoles.Employer)]
    [HttpPost("{id:int}/close")]
    public async Task<IActionResult> Close(int id)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _jobService.CloseAsync(employerProfileId.Value, id);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = AppRoles.Employer)]
    [HttpGet("{id:int}/applications")]
    public async Task<IActionResult> GetApplications(int id)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _applicationService.GetForEmployerJobAsync(employerProfileId.Value, id);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
