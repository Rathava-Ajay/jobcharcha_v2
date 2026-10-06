using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Store;

namespace JobPortal.Application.Interfaces;

public interface IStoreOrderService
{
    Task<ServiceResult<CheckoutResponse>> CheckoutAsync(string userId, CheckoutRequest request);
    Task<ServiceResult<VerifyStoreOrderResponse>> VerifyAsync(string userId, VerifyStoreOrderRequest request);
    Task<List<StoreOrderDto>> GetMyOrdersAsync(string userId);
    Task<ServiceResult<string>> GetDownloadUrlAsync(string userId, int orderId, int orderItemId);
    /// <summary>Settles a store order from a signed Razorpay <c>payment.captured</c>/<c>order.paid</c> webhook, so a buyer who paid and
    /// closed the browser before /verify still gets the order. Returns false when the Razorpay order is not a store order.</summary>
    Task<bool> FulfillCapturedAsync(string razorpayOrderId, string? razorpayPaymentId, long? amountPaise, string? currency);
    /// <summary>Admin view of store orders (newest first) with verified revenue and per-status counts, so successful, failed, pending and refunded orders can be told apart.</summary>
    Task<AdminStoreOrderPage> GetAdminOrdersAsync(string? status, int page, int pageSize);
    Task<ServiceResult<RefundStoreOrderResponse>> AdminRefundAsync(int orderId, string adminUserId, string? reason);
}
