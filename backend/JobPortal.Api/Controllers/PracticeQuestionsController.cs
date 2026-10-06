using JobPortal.Application.DTOs.PracticeQuestions;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/practice-questions")]
[EnableRateLimiting("search")]
public class PracticeQuestionsController : ControllerBase
{
    private readonly IPracticeQuestionService _practiceQuestionService;

    public PracticeQuestionsController(IPracticeQuestionService practiceQuestionService)
    {
        _practiceQuestionService = practiceQuestionService;
    }

    [HttpGet("exams")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetExams() => Ok(await _practiceQuestionService.GetExamsAsync());

    [HttpGet("subjects")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetSubjects([FromQuery] int examId) => Ok(await _practiceQuestionService.GetSubjectsAsync(examId));

    [HttpGet("topics")]
    [ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "*" })]
    public async Task<IActionResult> GetTopics([FromQuery] int examId, [FromQuery] string? subject) =>
        Ok(await _practiceQuestionService.GetTopicsAsync(examId, subject));

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PracticeQuestionQuery query) =>
        Ok(await _practiceQuestionService.SearchAsync(query));
}
