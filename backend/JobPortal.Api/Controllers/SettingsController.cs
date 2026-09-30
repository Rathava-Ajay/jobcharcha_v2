using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Settings;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await _settingsService.GetAsync());

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut]
    public async Task<IActionResult> Update(SiteSettingsDto dto) => Ok(await _settingsService.UpdateAsync(dto));
}
