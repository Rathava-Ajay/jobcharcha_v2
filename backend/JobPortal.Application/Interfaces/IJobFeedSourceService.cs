using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IJobFeedSourceService
{
    Task<List<JobFeedSourceDto>> GetAllAsync();
    Task<JobFeedSourceDto?> GetByIdAsync(int id);
    Task<ServiceResult<JobFeedSourceDto>> CreateAsync(UpsertJobFeedSourceRequest request);
    Task<ServiceResult<JobFeedSourceDto>> UpdateAsync(int id, UpsertJobFeedSourceRequest request);
    Task<ServiceResult> DeleteAsync(int id);
    Task<ServiceResult> ReportFetchAsync(int id, ReportFeedFetchRequest request);
}
