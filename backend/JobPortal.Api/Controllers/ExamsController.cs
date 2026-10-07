using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/exams")]
public class ExamsController : ControllerBase
{
    private readonly IExamService _examService;

    public ExamsController(IExamService examService)
    {
        _examService = examService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetAll([FromQuery] int? categoryId) =>
        Ok(await _examService.GetAllAsync(categoryId));

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _examService.GetAllForAdminAsync());

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/{id:int}")]
    public async Task<IActionResult> GetByIdForAdmin(int id)
    {
        var item = await _examService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertExamRequest request)
    {
        var result = await _examService.CreateAsync(request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertExamRequest request)
    {
        var result = await _examService.UpdateAsync(id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _examService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
