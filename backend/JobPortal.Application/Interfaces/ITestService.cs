using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;

namespace JobPortal.Application.Interfaces;

public interface ITestService
{
    Task<List<TestListItemDto>> SearchAsync(int? categoryId, int? examId, string? search, bool? isFree);
    Task<TestDetailDto?> GetBySlugAsync(string slug, string? userId);
    Task<List<TestAdminListItemDto>> GetAllForAdminAsync();
    Task<ServiceResult<TestDetailDto>> CreateAsync(UpsertTestRequest request, string userId);
    Task<ServiceResult<TestDetailDto>> UpdateAsync(int id, UpsertTestRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
