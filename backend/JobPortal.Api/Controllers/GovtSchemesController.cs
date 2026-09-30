using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.GovtSchemes;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/govtschemes")]
[EnableRateLimiting("search")]
public class GovtSchemesController : ControllerBase
{
    private readonly IGovtSchemeService _govtSchemeService;

    public GovtSchemesController(IGovtSchemeService govtSchemeService)
    {
        _govtSchemeService = govtSchemeService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [ResponseCache(Duration = 120)]
    public async Task<IActionResult> GetAll() => Ok(await _govtSchemeService.GetAllAsync());

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var item = await _govtSchemeService.GetBySlugAsync(slug);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _govtSchemeService.GetAllAsync(includeInactive: true));

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/{id:int}")]
    public async Task<IActionResult> GetByIdForAdmin(int id)
    {
        var item = await _govtSchemeService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertGovtSchemeRequest request)
    {
        var result = await _govtSchemeService.CreateAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertGovtSchemeRequest request)
    {
        var result = await _govtSchemeService.UpdateAsync(id, request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _govtSchemeService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
