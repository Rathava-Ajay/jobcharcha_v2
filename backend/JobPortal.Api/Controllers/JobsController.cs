using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/jobs")]
[EnableRateLimiting("search")]
public class JobsController : ControllerBase
{
    private readonly IJobService _jobService;

    public JobsController(IJobService jobService)
    {
        _jobService = jobService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> Search([FromQuery] JobQuery query) =>
        Ok(await _jobService.SearchAsync(query));

    [HttpGet("latest")]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> Latest([FromQuery] int count = 10) =>
        Ok(await _jobService.GetLatestAsync(count));

    [HttpGet("trending")]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> Trending([FromQuery] int count = 10) =>
        Ok(await _jobService.GetTrendingAsync(count));

    [HttpGet("{slug}")]
    [ResponseCache(Duration = 120, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var job = await _jobService.GetBySlugAsync(slug);
        return job is null ? NotFound() : Ok(job);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin")]
    public async Task<IActionResult> SearchForAdmin([FromQuery] JobQuery query) =>
        Ok(await _jobService.SearchAsync(query, includeInactive: true));

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/{id:int}")]
    public async Task<IActionResult> GetByIdForAdmin(int id)
    {
        var job = await _jobService.GetByIdAsync(id);
        return job is null ? NotFound() : Ok(job);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertJobRequest request)
    {
        var result = await _jobService.CreateAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost("ai-import")]
    public async Task<IActionResult> CreateFromAiImport(AiImportJobRequest request)
    {
        var result = await _jobService.CreateFromAiImportAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertJobRequest request)
    {
        var result = await _jobService.UpdateAsync(id, request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _jobService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] int status)
    {
        var result = await _jobService.SetStatusAsync(id, status, UserId);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPatch("{id:int}/active")]
    public async Task<IActionResult> SetActive(int id, [FromBody] bool isActive)
    {
        var result = await _jobService.SetActiveAsync(id, isActive, UserId);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost("admin/bulk-import")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> BulkImport(IFormFile file)
    {
        if (file.Length == 0) return BadRequest(new { ErrorCode = "EmptyFile", Error = "No file uploaded." });
        using var reader = new StreamReader(file.OpenReadStream());
        var content = await reader.ReadToEndAsync();
        var result = await _jobService.BulkImportAsync(content, UserId);
        return Ok(result);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/export")]
    public async Task<IActionResult> ExportCsv()
    {
        var csv = await _jobService.ExportCsvAsync();
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"jobs-export-{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}
