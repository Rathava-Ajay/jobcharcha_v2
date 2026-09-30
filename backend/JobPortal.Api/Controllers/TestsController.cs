using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/tests")]
[EnableRateLimiting("search")]
public class TestsController : ControllerBase
{
    private readonly ITestService _testService;

    public TestsController(ITestService testService)
    {
        _testService = testService;
    }

    private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] int? categoryId, [FromQuery] int? examId, [FromQuery] string? search, [FromQuery] bool? isFree) =>
        Ok(await _testService.SearchAsync(categoryId, examId, search, isFree));

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var test = await _testService.GetBySlugAsync(slug, UserId);
        return test is null ? NotFound() : Ok(test);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin() => Ok(await _testService.GetAllForAdminAsync());

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost]
    public async Task<IActionResult> Create(UpsertTestRequest request)
    {
        var result = await _testService.CreateAsync(request, UserId!);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertTestRequest request)
    {
        var result = await _testService.UpdateAsync(id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _testService.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
