using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Payments;

namespace JobPortal.Application.Interfaces;

public interface IPaymentService
{
    Task<ServiceResult<CreateOrderResponse>> CreateOrderAsync(string userId, CreateOrderRequest request);
    Task<ServiceResult<VerifyPaymentResponse>> VerifyPaymentAsync(string userId, VerifyPaymentRequest request);
    Task<bool> HandleWebhookAsync(string rawBody, string? signatureHeader);
    Task<PaymentHistoryDto> GetHistoryAsync(string userId);

    Task<ServiceResult<RefundPaymentResponse>> AdminRefundAsync(int paymentId, string adminUserId, string? reason);
    Task<List<StuckPaymentDto>> GetStuckPendingPaymentsAsync(int olderThanMinutes = 30);
    Task<ServiceResult<ResyncPaymentResponse>> ResyncPaymentAsync(int paymentId);
    Task<List<DisputeDto>> GetDisputesAsync(string? status = null);
    Task<RazorpayHealthDto> CheckRazorpayHealthAsync();
}
