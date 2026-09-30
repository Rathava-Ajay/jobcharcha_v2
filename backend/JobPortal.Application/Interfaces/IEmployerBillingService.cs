using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;

namespace JobPortal.Application.Interfaces;

public interface IEmployerBillingService
{
    Task<EmployerSubscriptionDto> GetSubscriptionAsync(int employerProfileId);
    Task<EmployerCreditsDto> GetCreditsAsync(int employerProfileId);
    Task<ServiceResult<EmployerCreateOrderResponse>> CreateRenewOrderAsync(int employerProfileId, RenewSubscriptionRequest request);
    Task<ServiceResult<EmployerCreateOrderResponse>> CreateTopUpOrderAsync(int employerProfileId, TopUpCreditsRequest request);
    Task<ServiceResult<EmployerVerifyPaymentResponse>> VerifyPaymentAsync(int employerProfileId, EmployerVerifyPaymentRequest request);
    Task<AcknowledgmentStatusDto> GetAcknowledgmentStatusAsync(int employerProfileId);
    Task<ServiceResult> AcknowledgeTermsAsync(int employerProfileId, AcknowledgeTermsRequest request, string? ipAddress);
}
