using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;

namespace JobPortal.Application.Interfaces;

public interface IEmployerJobService
{
    Task<List<EmployerJobListItemDto>> GetMineAsync(int employerProfileId);
    Task<EmployerJobDto?> GetByIdForEmployerAsync(int employerProfileId, int id);
    Task<ServiceResult<EmployerJobDto>> CreateAsync(int employerProfileId, UpsertEmployerJobRequest request);
    Task<ServiceResult<EmployerJobDto>> UpdateAsync(int employerProfileId, int id, UpsertEmployerJobRequest request);
    Task<ServiceResult> CloseAsync(int employerProfileId, int id);

    Task<List<PublicEmployerJobListItemDto>> SearchPublicAsync(string? search, string? city, string? jobType);
    Task<PublicEmployerJobDetailDto?> GetPublicBySlugAsync(string slug, string? viewerUserId);

    // --- Admin moderation of first-time employer postings ---
    Task<List<AdminPendingEmployerJobDto>> GetPendingReviewAsync();
    Task<ServiceResult> ApproveAsync(int employerJobId, string adminUserId);
    Task<ServiceResult> RejectAsync(int employerJobId, string adminUserId, string reason);
}
