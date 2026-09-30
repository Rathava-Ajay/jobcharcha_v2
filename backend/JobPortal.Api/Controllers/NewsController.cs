using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.News;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/news")]
[EnableRateLimiting("search")]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService)
    {
        _newsService = newsService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [ResponseCache(Duration = 60)]
    public async Task<IActionResult> GetAll() => Ok(await _newsService.GetAllAsync());

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 120)]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var item = await _newsService.GetBySlugAsync(slug);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _newsService.GetAllAsync(includeInactive: true));

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/{id:int}")]
    public async Task<IActionResult> GetByIdForAdmin(int id)
    {
        var item = await _newsService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertNewsRequest request)
    {
        var result = await _newsService.CreateAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertNewsRequest request)
    {
        var result = await _newsService.UpdateAsync(id, request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _newsService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
