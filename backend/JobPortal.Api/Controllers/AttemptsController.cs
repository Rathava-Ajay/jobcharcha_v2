using System.Security.Claims;
using JobPortal.Application.DTOs.Tests;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/attempts")]
[Authorize]
public class AttemptsController : ControllerBase
{
    private readonly ITestAttemptService _attemptService;

    public AttemptsController(ITestAttemptService attemptService)
    {
        _attemptService = attemptService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartAttemptRequest request)
    {
        var result = await _attemptService.StartAsync(request.TestId, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine() => Ok(await _attemptService.GetMyHistoryAsync(UserId));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetSession(int id)
    {
        var result = await _attemptService.GetSessionAsync(id, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/responses")]
    public async Task<IActionResult> SaveResponse(int id, [FromBody] SaveResponseRequest request)
    {
        var result = await _attemptService.SaveResponseAsync(id, UserId, request);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> Submit(int id)
    {
        var result = await _attemptService.SubmitAsync(id, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet("{id:int}/result")]
    public async Task<IActionResult> GetResult(int id)
    {
        var result = await _attemptService.GetResultAsync(id, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }
}

public class StartAttemptRequest
{
    public int TestId { get; set; }
}
