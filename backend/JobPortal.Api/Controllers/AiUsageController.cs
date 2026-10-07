using JobPortal.Application.Common;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

/// <summary>Token consumption of the paid AI providers: Claude (AI Magic sync agent runs) and OpenAI (share images).</summary>
[ApiController]
[Route("api/admin/ai-usage")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class AiUsageController : ControllerBase
{
    private readonly IAiUsageService _usage;

    public AiUsageController(IAiUsageService usage) => _usage = usage;

    /// <summary>Today, per-day, per-category and recent calls for the last <c>days</c> days (default 7, max 90).</summary>
    [HttpGet]
    public async Task<IActionResult> Report([FromQuery] int days = 7) => Ok(await _usage.GetReportAsync(days));
}
