using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;

namespace JobPortal.Application.Interfaces;

public interface IExamService
{
    Task<List<ExamDto>> GetAllAsync(int? categoryId = null);
    Task<List<ExamDto>> GetAllForAdminAsync();
    Task<ExamDto?> GetByIdAsync(int id);
    Task<ServiceResult<ExamDto>> CreateAsync(UpsertExamRequest request, string userId);
    Task<ServiceResult<ExamDto>> UpdateAsync(int id, UpsertExamRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
