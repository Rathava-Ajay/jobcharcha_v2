using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Alerts;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/alert-preferences")]
public class AlertPreferencesController : ControllerBase
{
    private readonly IAlertPreferenceService _alertPreferenceService;

    public AlertPreferencesController(IAlertPreferenceService alertPreferenceService)
    {
        _alertPreferenceService = alertPreferenceService;
    }

    [HttpPost]
    public async Task<IActionResult> Subscribe(SubscribeAlertRequest request)
    {
        var result = await _alertPreferenceService.SubscribeAsync(request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet("unsubscribe/{token}")]
    public async Task<IActionResult> Unsubscribe(string token)
    {
        var result = await _alertPreferenceService.UnsubscribeAsync(token);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _alertPreferenceService.GetAllForAdminAsync());

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("admin/{id:int}/active")]
    public async Task<IActionResult> SetActive(int id, [FromBody] SetAlertPreferenceActiveRequest request)
    {
        var result = await _alertPreferenceService.SetActiveAsync(id, request.IsActive);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
