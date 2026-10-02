using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IContentDraftService
{
    Task<PagedResult<ContentDraftListItemDto>> SearchAsync(string? category, int? status, int page = 1, int pageSize = 20);
    Task<ContentDraftDto?> GetByIdAsync(int id);
    Task<List<ContentCategorySummaryDto>> GetSummaryAsync();
    Task<ServiceResult<ContentDraftIngestResultDto>> IngestAsync(IngestContentDraftRequest request);
    Task<ServiceResult<ContentApprovedResultDto>> ApproveAsync(int id, ApproveContentDraftRequest request, string userId);
    Task<ServiceResult> RejectAsync(int id, RejectContentDraftRequest request, string userId);
    Task<ServiceResult> DeleteAsync(int id);
}

public interface IContentSourceService
{
    Task<List<ContentSourceDto>> GetAllAsync(string? category);
    Task<ServiceResult<ContentSourceDto>> CreateAsync(UpsertContentSourceRequest request);
    Task<ServiceResult<ContentSourceDto>> UpdateAsync(int id, UpsertContentSourceRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}

public interface IContentSyncService
{
    /// <summary>Queues an AI-agent run for one category (or all of them, one after another). Returns once the
    /// runs are queued — the agent itself runs in the background for minutes.</summary>
    Task<ServiceResult<List<ContentSyncRunDto>>> StartAsync(string? category, string userId);
    Task<List<ContentSyncRunDto>> GetRecentRunsAsync(string? category, int take = 20);
}
