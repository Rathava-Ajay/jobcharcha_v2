using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IEmployerAdminAuditService
{
    Task<PagedResult<AdminContactLogItemDto>> GetContactLogsAsync(AdminContactLogQuery query);
    Task<ServiceResult<AdminEmployerOverviewDto>> GetEmployerOverviewAsync(int employerProfileId);
    Task<ServiceResult> AdjustCreditsAsync(ManualCreditAdjustmentRequest request, string adminUserId);
    Task<List<FraudFlagDto>> GetFraudFlagsAsync(int threshold = 20);
}
