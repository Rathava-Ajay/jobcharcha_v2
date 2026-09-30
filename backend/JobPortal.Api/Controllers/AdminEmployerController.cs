using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class AdminEmployerController : ControllerBase
{
    private readonly IEmployerAdminAuditService _auditService;

    public AdminEmployerController(IEmployerAdminAuditService auditService)
    {
        _auditService = auditService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("contact-logs")]
    public async Task<IActionResult> GetContactLogs([FromQuery] AdminContactLogQuery query) => Ok(await _auditService.GetContactLogsAsync(query));

    [HttpGet("employers/{id:int}/overview")]
    public async Task<IActionResult> GetEmployerOverview(int id)
    {
        var result = await _auditService.GetEmployerOverviewAsync(id);
        return result.Succeeded ? Ok(result.Data) : NotFound(new { result.ErrorCode, result.Error });
    }

    [HttpPost("employers/{id:int}/credits/adjust")]
    public async Task<IActionResult> AdjustCredits(int id, ManualCreditAdjustmentRequest request)
    {
        request.EmployerProfileId = id;
        var result = await _auditService.AdjustCreditsAsync(request, UserId);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet("employers/fraud-flags")]
    public async Task<IActionResult> GetFraudFlags([FromQuery] int threshold = 20) => Ok(await _auditService.GetFraudFlagsAsync(threshold));
}
