using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IEmployerContactService
{
    Task<ContactCandidateResponse> AttemptContactAsync(int employerProfileId, string candidateUserId, string? initialMessage);
    Task<PagedResult<ContactHistoryItemDto>> GetHistoryAsync(int employerProfileId, int page = 1, int pageSize = 20);
}
