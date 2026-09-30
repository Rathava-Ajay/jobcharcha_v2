using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Aspirant;

namespace JobPortal.Application.Interfaces;

public interface ISavedJobService
{
    Task<List<SavedJobDto>> GetMineAsync(string userId);

    /// <summary>Just the saved EmployerJob ids — for detail pages to show the filled/unfilled bookmark state.</summary>
    Task<List<int>> GetMyIdsAsync(string userId);

    /// <summary>Idempotent — saving an already-saved job is a no-op success.</summary>
    Task<ServiceResult> SaveAsync(string userId, int employerJobId);

    Task<ServiceResult> UnsaveAsync(string userId, int employerJobId);
}
