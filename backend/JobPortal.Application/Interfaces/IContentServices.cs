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

public interface IContentLinkChecker
{
    /// <summary>Null when the link looks fine (or can't be judged, e.g. bot-blocked); otherwise a short reason
    /// such as "returned HTTP 404" that reads after the field name in a warning.</summary>
    Task<string?> CheckAsync(string url);
}

public interface IContentSettingsService
{
    /// <summary>Always one entry per category; categories without a saved row show the server defaults.</summary>
    Task<List<ContentCategorySettingDto>> GetAllAsync();
    Task<ServiceResult<ContentCategorySettingDto>> UpdateAsync(string category, UpdateContentCategorySettingRequest request, string? userId = null);
}

public interface IContentSyncService
{
    /// <summary>Queues an AI-agent run for one category (or all of them, one after another). Returns once the
    /// runs are queued — the agent itself runs in the background for minutes.</summary>
    Task<ServiceResult<List<ContentSyncRunDto>>> StartAsync(string? category, string userId, string? scope = null);
    Task<List<ContentSyncRunDto>> GetRecentRunsAsync(string? category, int take = 20);
    /// <summary>Cancels one run, or every queued/running run when no id is given. Returns how many were cancelled.</summary>
    Task<ServiceResult<int>> CancelAsync(int? runId);
}
