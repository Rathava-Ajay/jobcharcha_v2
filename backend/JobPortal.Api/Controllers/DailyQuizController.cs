using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.DailyQuizzes;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/daily-quiz")]
[EnableRateLimiting("search")]
public class DailyQuizController : ControllerBase
{
    private readonly IDailyQuizService _dailyQuizService;

    public DailyQuizController(IDailyQuizService dailyQuizService)
    {
        _dailyQuizService = dailyQuizService;
    }

    private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet("today")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetToday()
    {
        // "No quiz published for today" is a normal state, not an error — return 200 null so it
        // doesn't show up as a failed request in the browser console on every homepage load.
        var quiz = await _dailyQuizService.GetTodayAsync();
        return Ok(quiz);
    }

    [HttpGet("dates")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetDates() => Ok(await _dailyQuizService.GetAvailableDatesAsync());

    [HttpGet("by-date/{date}")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetByDate(DateOnly date)
    {
        var quiz = await _dailyQuizService.GetByDateAsync(date);
        return quiz is null ? NotFound() : Ok(quiz);
    }

    [HttpGet("{id:int}/attempt")]
    public async Task<IActionResult> GetMyAttempt(int id, [FromQuery] string? guestKey)
    {
        var result = await _dailyQuizService.GetMyAttemptAsync(id, UserId, guestKey);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> Submit(int id, [FromBody] SubmitDailyQuizRequest request)
    {
        var result = await _dailyQuizService.SubmitAsync(id, UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost("admin/ai-import")]
    public async Task<IActionResult> AiImport(AiImportDailyQuizRequest request)
    {
        var result = await _dailyQuizService.CreateFromAiImportAsync(request, UserId!);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
