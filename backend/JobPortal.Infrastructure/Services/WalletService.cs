using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.DTOs.Payments;
using JobPortal.Application.DTOs.Wallet;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class WalletService : IWalletService
{
    private readonly AppDbContext _db;
    private readonly IPaymentService _paymentService;

    public WalletService(AppDbContext db, IPaymentService paymentService)
    {
        _db = db;
        _paymentService = paymentService;
    }

    public async Task<decimal> GetBalanceAsync(string userId)
    {
        var wallet = await _db.WalletCredits.AsNoTracking().FirstOrDefaultAsync(w => w.UserId == userId);
        return wallet?.BalanceInr ?? 0;
    }

    public async Task<List<WalletTransactionDto>> GetMyTransactionsAsync(string userId)
    {
        var transactions = await _db.WalletTransactions.AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .ToListAsync();
        return transactions.Select(ToDto).ToList();
    }

    public Task<ServiceResult<CreateOrderResponse>> CreateTopUpOrderAsync(string userId, decimal amount) =>
        _paymentService.CreateOrderAsync(userId, new CreateOrderRequest { PaymentFor = "WalletTopUp", Amount = amount });

    public Task<ServiceResult<VerifyPaymentResponse>> VerifyTopUpAsync(string userId, VerifyPaymentRequest request) =>
        _paymentService.VerifyPaymentAsync(userId, request);

    public async Task<AdminWalletLookupDto?> AdminSearchAsync(string emailOrUserId)
    {
        var user = await _db.AspNetUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == emailOrUserId || u.Email == emailOrUserId);
        if (user is null) return null;

        var wallet = await _db.WalletCredits.AsNoTracking().FirstOrDefaultAsync(w => w.UserId == user.Id);
        var transactions = await _db.WalletTransactions.AsNoTracking()
            .Where(t => t.UserId == user.Id)
            .OrderByDescending(t => t.CreatedAt)
            .Take(20)
            .ToListAsync();

        return new AdminWalletLookupDto
        {
            UserId = user.Id,
            Name = $"{user.FirstName} {user.LastName}".Trim(),
            Email = user.Email,
            Balance = wallet?.BalanceInr ?? 0,
            RecentTransactions = transactions.Select(ToDto).ToList(),
        };
    }

    public async Task<ServiceResult<decimal>> AdminAdjustAsync(string userId, decimal amount, string notes, string adminUserId, string? ipAddress)
    {
        if (amount == 0) return ServiceResult<decimal>.Fail("BadRequest", "Adjustment amount cannot be zero.");
        if (string.IsNullOrWhiteSpace(notes)) return ServiceResult<decimal>.Fail("BadRequest", "Notes are required for a manual wallet adjustment.");

        var userExists = await _db.AspNetUsers.AsNoTracking().AnyAsync(u => u.Id == userId);
        if (!userExists) return ServiceResult<decimal>.Fail("NotFound", "User not found.");

        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var wallet = await _db.WalletCredits.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet is null)
            {
                wallet = new WalletCredit { Id = Guid.NewGuid(), UserId = userId, BalanceInr = 0, UpdatedAt = DateTime.UtcNow };
                _db.WalletCredits.Add(wallet);
            }

            var newBalance = wallet.BalanceInr + amount;
            if (newBalance < 0) return ServiceResult<decimal>.Fail("InsufficientBalance", "This adjustment would take the wallet negative.");

            wallet.BalanceInr = newBalance;
            wallet.UpdatedAt = DateTime.UtcNow;

            _db.WalletTransactions.Add(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = amount,
                Type = "admin_adjustment",
                Description = $"{notes} (by {adminUserId})",
                ReferenceId = null,
                CreatedAt = DateTime.UtcNow,
            });

            // Separate from WalletTransaction (the balance ledger, mutable in spirit even if nothing
            // currently updates it) — this is the dedicated, never-updated compliance audit trail
            // the "Adjust wallets" tab is required to produce, mirroring EmployerContactLog's role
            // for the employer contact-unlock audit.
            _db.WalletAdjustmentAuditLogs.Add(new WalletAdjustmentAuditLog
            {
                AdminUserId = adminUserId,
                TargetUserId = userId,
                Amount = amount,
                Reason = notes,
                IpAddress = ipAddress,
                BalanceAfter = newBalance,
                CreatedDate = DateTime.UtcNow,
            });

            try
            {
                await _db.SaveChangesAsync();
                return ServiceResult<decimal>.Ok(newBalance);
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.Entity is WalletCredit or WalletTransaction or WalletAdjustmentAuditLog))
                    entry.State = EntityState.Detached;
            }
        }

        return ServiceResult<decimal>.Fail("ConcurrencyConflict", "Could not adjust the wallet after retries — please try again.");
    }

    public async Task<PagedResult<WalletAuditLogItemDto>> GetAdminAuditLogAsync(string? adminUserId, string? targetUserId, int page = 1, int pageSize = 30)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 30 : pageSize;

        var q = _db.WalletAdjustmentAuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(adminUserId)) q = q.Where(l => l.AdminUserId == adminUserId);
        if (!string.IsNullOrWhiteSpace(targetUserId)) q = q.Where(l => l.TargetUserId == targetUserId);

        var totalCount = await q.CountAsync();
        var rows = await q.OrderByDescending(l => l.CreatedDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        var userIds = rows.Select(l => l.AdminUserId).Concat(rows.Select(l => l.TargetUserId)).Distinct().ToList();
        var users = await _db.AspNetUsers.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email })
            .ToDictionaryAsync(u => u.Id);

        var items = rows.Select(l =>
        {
            users.TryGetValue(l.AdminUserId, out var admin);
            users.TryGetValue(l.TargetUserId, out var target);
            return new WalletAuditLogItemDto
            {
                Id = l.Id,
                AdminUserId = l.AdminUserId,
                AdminName = admin is null ? null : $"{admin.FirstName} {admin.LastName}".Trim(),
                TargetUserId = l.TargetUserId,
                TargetName = target is null ? null : $"{target.FirstName} {target.LastName}".Trim(),
                TargetEmail = target?.Email,
                Amount = l.Amount,
                Reason = l.Reason,
                IpAddress = l.IpAddress,
                BalanceAfter = l.BalanceAfter,
                CreatedDate = l.CreatedDate,
            };
        }).ToList();

        return new PagedResult<WalletAuditLogItemDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    private static WalletTransactionDto ToDto(WalletTransaction t) => new()
    {
        Id = t.Id,
        Amount = t.Amount,
        Type = t.Type,
        Description = t.Description,
        ReferenceId = t.ReferenceId,
        CreatedAt = t.CreatedAt,
    };
}
