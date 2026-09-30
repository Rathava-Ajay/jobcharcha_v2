using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/admin/audit")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class AdminAuditController : ControllerBase
{
    private readonly IAuditService _auditService;

    public AdminAuditController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    /// <summary>Newest-first feed of end-user activity, filtered + paged.</summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] AuditQuery query) =>
        Ok(await _auditService.QueryAsync(query));

    /// <summary>Category → event-type map that drives the admin filter dropdowns.</summary>
    [HttpGet("categories")]
    public IActionResult Categories() => Ok(AuditEventTypes.Catalog);

    /// <summary>Signup counts grouped by attribution source (e.g. how many aspirants/employers
    /// came from the Instagram join links) — optionally windowed by registration date.</summary>
    [HttpGet("signup-sources")]
    public async Task<IActionResult> SignupSources([FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        Ok(await _auditService.GetSignupSourceBreakdownAsync(from, to));
}
