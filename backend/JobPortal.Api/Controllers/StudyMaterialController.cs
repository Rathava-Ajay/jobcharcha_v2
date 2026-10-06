using JobPortal.Application.Common;
using JobPortal.Application.DTOs.StudyMaterials;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/study-materials")]
[EnableRateLimiting("search")]
public class StudyMaterialController : ControllerBase
{
    private readonly IStudyMaterialService _studyMaterialService;

    public StudyMaterialController(IStudyMaterialService studyMaterialService)
    {
        _studyMaterialService = studyMaterialService;
    }

    [HttpGet]
    [ResponseCache(Duration = 120, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> Search([FromQuery] int? categoryId, [FromQuery] string? materialType, [FromQuery] string? search) =>
        Ok(await _studyMaterialService.SearchAsync(categoryId, materialType, search));

    [HttpPost("{slug}/download")]
    public async Task<IActionResult> RegisterDownload(string slug)
    {
        var path = await _studyMaterialService.RegisterDownloadAsync(slug);
        return path is null ? NotFound() : Ok(new { downloadUrl = path });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _studyMaterialService.GetAllForAdminAsync());

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertStudyMaterialRequest request)
    {
        var result = await _studyMaterialService.CreateAsync(request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertStudyMaterialRequest request)
    {
        var result = await _studyMaterialService.UpdateAsync(id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _studyMaterialService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
