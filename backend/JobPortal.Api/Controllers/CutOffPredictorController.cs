using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/cutoff-predictor")]
[EnableRateLimiting("search")]
public class CutOffPredictorController : ControllerBase
{
    private readonly ICutOffService _cutOffService;

    public CutOffPredictorController(ICutOffService cutOffService)
    {
        _cutOffService = cutOffService;
    }

    [HttpGet("exams")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetExams() => Ok(await _cutOffService.GetExamsAsync());

    [HttpGet("exams/{slug}/posts")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetPostNames(string slug) => Ok(await _cutOffService.GetPostNamesAsync(slug));

    [HttpGet("records")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> Search([FromQuery] string? slug, [FromQuery] int? year, [FromQuery] string? postName) =>
        Ok(await _cutOffService.SearchAsync(slug, year, postName));

    [HttpGet("predict")]
    public async Task<IActionResult> Predict([FromQuery] string slug, [FromQuery] string postName, [FromQuery] string category)
    {
        var result = await _cutOffService.PredictAsync(slug, postName, category);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
