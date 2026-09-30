using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Aspirant;

namespace JobPortal.Application.Interfaces;

public interface IAspirantProfileService
{
    /// <summary>Full Career Hub profile for the signed-in aspirant. Creates an empty JobSeekerProfile row on first access.</summary>
    Task<ServiceResult<AspirantProfileDto>> GetAsync(string userId);

    /// <summary>Section-by-section upsert — every section on the request is optional. Recomputes completion
    /// and keeps the legacy flat columns (Skills/Education/WorkExperience/PreferredCities/ExpectedSalary) in sync.</summary>
    Task<ServiceResult<AspirantProfileDto>> UpsertAsync(string userId, UpsertAspirantProfileRequest request);

    /// <summary>Clears the stored résumé and its uploaded-date, then recomputes completion.</summary>
    Task<ServiceResult<AspirantProfileDto>> DeleteResumeAsync(string userId);
}
