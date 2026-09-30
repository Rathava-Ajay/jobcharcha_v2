using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Store;

namespace JobPortal.Application.Interfaces;

public interface IStoreOrderService
{
    Task<ServiceResult<CheckoutResponse>> CheckoutAsync(string userId, CheckoutRequest request);
    Task<ServiceResult<VerifyStoreOrderResponse>> VerifyAsync(string userId, VerifyStoreOrderRequest request);
    Task<List<StoreOrderDto>> GetMyOrdersAsync(string userId);
    Task<ServiceResult<string>> GetDownloadUrlAsync(string userId, int orderId, int orderItemId);
    Task<ServiceResult<RefundStoreOrderResponse>> AdminRefundAsync(int orderId, string adminUserId, string? reason);
}
