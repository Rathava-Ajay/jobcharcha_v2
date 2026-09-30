using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.AdmitCards;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/admitcards")]
[EnableRateLimiting("search")]
public class AdmitCardsController : ControllerBase
{
    private readonly IAdmitCardService _admitCardService;

    public AdmitCardsController(IAdmitCardService admitCardService)
    {
        _admitCardService = admitCardService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [ResponseCache(Duration = 60)]
    public async Task<IActionResult> GetAll() => Ok(await _admitCardService.GetAllAsync());

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 120)]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var item = await _admitCardService.GetBySlugAsync(slug);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _admitCardService.GetAllAsync(includeInactive: true));

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/{id:int}")]
    public async Task<IActionResult> GetByIdForAdmin(int id)
    {
        var item = await _admitCardService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertAdmitCardRequest request)
    {
        var result = await _admitCardService.CreateAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost("ai-import")]
    public async Task<IActionResult> CreateFromAiImport(AiImportAdmitCardRequest request)
    {
        var result = await _admitCardService.CreateFromAiImportAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertAdmitCardRequest request)
    {
        var result = await _admitCardService.UpdateAsync(id, request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _admitCardService.DeleteAsync(id);
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
        var result = await _admitCardService.BulkImportAsync(content, UserId);
        return Ok(result);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/export")]
    public async Task<IActionResult> ExportCsv()
    {
        var csv = await _admitCardService.ExportCsvAsync();
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"admitcards-export-{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}
