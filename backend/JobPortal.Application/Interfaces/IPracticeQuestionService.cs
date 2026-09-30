using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.DTOs.PracticeQuestions;

namespace JobPortal.Application.Interfaces;

public interface IPracticeQuestionService
{
    Task<List<PracticeExamOptionDto>> GetExamsAsync();
    Task<List<string>> GetSubjectsAsync(int examId);
    Task<List<string>> GetTopicsAsync(int examId, string? subject);
    Task<PagedResult<PracticeQuestionDto>> SearchAsync(PracticeQuestionQuery query);
}
