using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IEmployerCandidateService
{
    Task<PagedResult<CandidateListItemDto>> SearchAsync(CandidateSearchQuery query, int employerProfileId);
    Task<ServiceResult<CandidateProfileDto>> GetProfileAsync(string candidateUserId, int employerProfileId);
}
