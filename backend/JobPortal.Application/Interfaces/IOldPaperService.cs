using JobPortal.Application.Common;
using JobPortal.Application.DTOs.OldPapers;

namespace JobPortal.Application.Interfaces;

public interface IOldPaperService
{
    Task<List<OldPaperListItemDto>> SearchAsync(int? categoryId, int? year, string? search);
    Task<OldPaperDetailDto?> GetBySlugAsync(string slug);
    Task<List<int>> GetAvailableYearsAsync();
    Task<string?> RegisterDownloadAsync(string slug);

    Task<List<OldPaperDetailDto>> GetAllForAdminAsync();
    Task<ServiceResult<OldPaperDetailDto>> CreateAsync(UpsertOldPaperRequest request, string userId);
    Task<ServiceResult<OldPaperDetailDto>> UpdateAsync(int id, UpsertOldPaperRequest request);
    Task<ServiceResult> DeleteAsync(int id);
    Task<BulkImportResult> BulkImportAsync(string csvContent, string userId);
    Task<string> ExportCsvAsync();
}
