using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Blogs;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/blog")]
[EnableRateLimiting("search")]
public class BlogController : ControllerBase
{
    private readonly IBlogService _blogService;

    public BlogController(IBlogService blogService)
    {
        _blogService = blogService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [ResponseCache(Duration = 120, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetAll() => Ok(await _blogService.GetAllAsync());

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var item = await _blogService.GetBySlugAsync(slug);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _blogService.GetAllAsync(includeInactive: true));

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/{id:int}")]
    public async Task<IActionResult> GetByIdForAdmin(int id)
    {
        var item = await _blogService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertBlogRequest request)
    {
        var result = await _blogService.CreateAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertBlogRequest request)
    {
        var result = await _blogService.UpdateAsync(id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _blogService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
