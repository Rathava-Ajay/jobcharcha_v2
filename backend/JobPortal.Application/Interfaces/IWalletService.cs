using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.DTOs.Payments;
using JobPortal.Application.DTOs.Wallet;

namespace JobPortal.Application.Interfaces;

public interface IWalletService
{
    Task<decimal> GetBalanceAsync(string userId);
    Task<List<WalletTransactionDto>> GetMyTransactionsAsync(string userId);
    Task<ServiceResult<CreateOrderResponse>> CreateTopUpOrderAsync(string userId, decimal amount);
    Task<ServiceResult<VerifyPaymentResponse>> VerifyTopUpAsync(string userId, VerifyPaymentRequest request);

    Task<AdminWalletLookupDto?> AdminSearchAsync(string emailOrUserId);
    Task<ServiceResult<decimal>> AdminAdjustAsync(string userId, decimal amount, string notes, string adminUserId, string? ipAddress);
    Task<PagedResult<WalletAuditLogItemDto>> GetAdminAuditLogAsync(string? adminUserId, string? targetUserId, int page = 1, int pageSize = 30);
}
