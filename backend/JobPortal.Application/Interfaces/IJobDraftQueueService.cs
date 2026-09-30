using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IJobDraftQueueService
{
    Task<PagedResult<JobDraftQueueListItemDto>> SearchAsync(int? status, int page = 1, int pageSize = 20);
    Task<JobDraftQueueDto?> GetByIdAsync(int id);

    /// <summary>Idempotent — a repeat ingest of an already-known post creates nothing and never changes
    /// the existing row's status; the returned Outcome says why it was skipped. The watcher agent
    /// re-fetches sources every cycle and can't know in advance what it already reported.</summary>
    Task<ServiceResult<JobDraftIngestResultDto>> IngestAsync(CreateJobDraftRequest request);

    Task<ServiceResult<JobDto>> ApproveAsync(int id, AiImportJobRequest request, string userId);
    Task<ServiceResult> RejectAsync(int id, RejectJobDraftRequest request, string userId);
    Task<ServiceResult> DeleteAsync(int id);
}
