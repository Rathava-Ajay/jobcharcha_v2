using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/job-applications")]
public class JobApplicationsController : ControllerBase
{
    private readonly IJobApplicationService _applicationService;
    private readonly IEmployerContextService _employerContext;

    public JobApplicationsController(IJobApplicationService applicationService, IEmployerContextService employerContext)
    {
        _applicationService = applicationService;
        _employerContext = employerContext;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [Authorize(Roles = AppRoles.JobSeeker)]
    [HttpPost("{employerJobId:int}")]
    public async Task<IActionResult> Apply(int employerJobId, ApplyToJobRequest request)
    {
        var result = await _applicationService.ApplyAsync(UserId, employerJobId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = AppRoles.JobSeeker)]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine() => Ok(await _applicationService.GetMineAsync(UserId));

    [Authorize(Roles = AppRoles.Employer)]
    [HttpPut("{applicationId:int}/status")]
    public async Task<IActionResult> UpdateStatus(int applicationId, UpdateApplicationStatusRequest request)
    {
        var employerProfileId = await _employerContext.ResolveEmployerProfileIdAsync(UserId);
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _applicationService.UpdateStatusAsync(employerProfileId.Value, applicationId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
