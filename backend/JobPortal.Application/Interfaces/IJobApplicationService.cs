using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;

namespace JobPortal.Application.Interfaces;

public interface IJobApplicationService
{
    Task<ServiceResult<MyApplicationDto>> ApplyAsync(string applicantUserId, int employerJobId, ApplyToJobRequest request);
    Task<List<MyApplicationDto>> GetMineAsync(string applicantUserId);

    Task<ServiceResult<List<JobApplicationDto>>> GetForEmployerJobAsync(int employerProfileId, int employerJobId);
    Task<ServiceResult<JobApplicationDto>> UpdateStatusAsync(int employerProfileId, int applicationId, UpdateApplicationStatusRequest request);
}
