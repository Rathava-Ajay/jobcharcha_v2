using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;

namespace JobPortal.Application.Interfaces;

public interface ITestAttemptService
{
    Task<ServiceResult<AttemptSessionDto>> StartAsync(int testId, string userId);
    Task<ServiceResult<AttemptSessionDto>> GetSessionAsync(int attemptId, string userId);
    Task<ServiceResult> SaveResponseAsync(int attemptId, string userId, SaveResponseRequest request);
    Task<ServiceResult<AttemptResultDto>> SubmitAsync(int attemptId, string userId);
    Task<List<AttemptHistoryItemDto>> GetMyHistoryAsync(string userId);
    Task<ServiceResult<AttemptResultDto>> GetResultAsync(int attemptId, string userId);
}
