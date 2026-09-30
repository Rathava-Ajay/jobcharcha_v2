using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.OldPapers;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/old-papers")]
[EnableRateLimiting("search")]
public class OldPapersController : ControllerBase
{
    private readonly IOldPaperService _oldPaperService;

    public OldPapersController(IOldPaperService oldPaperService)
    {
        _oldPaperService = oldPaperService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [ResponseCache(Duration = 120)]
    public async Task<IActionResult> Search([FromQuery] int? categoryId, [FromQuery] int? year, [FromQuery] string? search) =>
        Ok(await _oldPaperService.SearchAsync(categoryId, year, search));

    [HttpGet("years")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetYears() => Ok(await _oldPaperService.GetAvailableYearsAsync());

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var paper = await _oldPaperService.GetBySlugAsync(slug);
        return paper is null ? NotFound() : Ok(paper);
    }

    [HttpPost("{slug}/download")]
    public async Task<IActionResult> RegisterDownload(string slug)
    {
        var link = await _oldPaperService.RegisterDownloadAsync(slug);
        return link is null ? NotFound() : Ok(new { downloadUrl = link });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _oldPaperService.GetAllForAdminAsync());

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertOldPaperRequest request)
    {
        var result = await _oldPaperService.CreateAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertOldPaperRequest request)
    {
        var result = await _oldPaperService.UpdateAsync(id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _oldPaperService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost("admin/bulk-import")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> BulkImport(IFormFile file)
    {
        if (file.Length == 0) return BadRequest(new { ErrorCode = "EmptyFile", Error = "No file uploaded." });
        using var reader = new StreamReader(file.OpenReadStream());
        var content = await reader.ReadToEndAsync();
        var result = await _oldPaperService.BulkImportAsync(content, UserId);
        return Ok(result);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/export")]
    public async Task<IActionResult> ExportCsv()
    {
        var csv = await _oldPaperService.ExportCsvAsync();
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"old-papers-export-{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}
