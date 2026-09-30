using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Results;

namespace JobPortal.Application.Interfaces;

public interface IResultService
{
    Task<List<ResultListItemDto>> GetAllAsync(bool includeInactive = false);
    Task<ResultDto?> GetBySlugAsync(string slug);
    Task<ResultDto?> GetByIdAsync(int id);
    Task<ServiceResult<ResultDto>> CreateAsync(UpsertResultRequest request, string userId);
    Task<ServiceResult<ResultDto>> CreateFromAiImportAsync(AiImportResultRequest request, string userId);
    Task<ServiceResult<ResultDto>> UpdateAsync(int id, UpsertResultRequest request, string userId);
    Task<BulkImportResult> BulkImportAsync(string csvContent, string userId);
    Task<string> ExportCsvAsync();
    Task<ServiceResult> DeleteAsync(int id);
}
