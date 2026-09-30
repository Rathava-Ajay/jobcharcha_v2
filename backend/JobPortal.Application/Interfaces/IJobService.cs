using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IJobService
{
    Task<PagedResult<JobListItemDto>> SearchAsync(JobQuery query, bool includeInactive = false);
    Task<List<JobListItemDto>> GetLatestAsync(int count = 10);
    Task<List<JobListItemDto>> GetTrendingAsync(int count = 10);
    Task<JobDto?> GetBySlugAsync(string slug);
    Task<JobDto?> GetByIdAsync(int id);
    Task<ServiceResult<JobDto>> CreateAsync(UpsertJobRequest request, string userId);
    Task<ServiceResult<JobDto>> CreateFromAiImportAsync(AiImportJobRequest request, string userId);
    Task<ServiceResult<JobDto>> UpdateAsync(int id, UpsertJobRequest request, string userId);
    Task<ServiceResult> DeleteAsync(int id);
    Task<ServiceResult> SetStatusAsync(int id, int status, string userId);
    Task<ServiceResult> SetActiveAsync(int id, bool isActive, string userId);

    /// <summary>Each row goes through the exact same validation as a single-record CreateAsync call
    /// (category existence, duplicate-fingerprint check, slug uniqueness) — this is literally
    /// CreateAsync in a loop over parsed CSV rows, not a parallel validation path.</summary>
    Task<BulkImportResult> BulkImportAsync(string csvContent, string userId);
    Task<string> ExportCsvAsync();
}
