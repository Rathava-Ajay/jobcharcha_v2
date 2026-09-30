using JobPortal.Application.Common;
using JobPortal.Application.DTOs.DailyQuizzes;

namespace JobPortal.Application.Interfaces;

public interface IDailyQuizService
{
    Task<DailyQuizDto?> GetTodayAsync();
    Task<DailyQuizDto?> GetByDateAsync(DateOnly date);
    Task<List<string>> GetAvailableDatesAsync();
    Task<DailyQuizResultDto?> GetMyAttemptAsync(int dailyQuizId, string? userId, string? guestKey);
    Task<ServiceResult<DailyQuizResultDto>> SubmitAsync(int dailyQuizId, string? userId, SubmitDailyQuizRequest request);
    Task<ServiceResult<DailyQuizDto>> CreateFromAiImportAsync(AiImportDailyQuizRequest request, string userId);
}
