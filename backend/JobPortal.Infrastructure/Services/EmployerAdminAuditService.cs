using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class EmployerAdminAuditService : IEmployerAdminAuditService
{
    private const int DefaultFraudThreshold = 20;

    private readonly AppDbContext _db;
    private readonly IEmployerBillingService _billing;

    public EmployerAdminAuditService(AppDbContext db, IEmployerBillingService billing)
    {
        _db = db;
        _billing = billing;
    }

    public async Task<PagedResult<AdminContactLogItemDto>> GetContactLogsAsync(AdminContactLogQuery query)
    {
        var q = _db.EmployerContactLogs.AsNoTracking()
            .Include(c => c.EmployerProfile)
            .Include(c => c.CandidateUser)
            .AsQueryable();

        if (query.EmployerProfileId.HasValue) q = q.Where(c => c.EmployerProfileId == query.EmployerProfileId.Value);
        if (!string.IsNullOrWhiteSpace(query.Status)) q = q.Where(c => c.Status == query.Status);
        if (query.DateFrom.HasValue) q = q.Where(c => c.CreatedDate >= query.DateFrom.Value);
        if (query.DateTo.HasValue) q = q.Where(c => c.CreatedDate <= query.DateTo.Value);

        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 100 ? 20 : query.PageSize;

        var totalCount = await q.CountAsync();
        var items = await q.OrderByDescending(c => c.CreatedDate).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new AdminContactLogItemDto
            {
                Id = c.Id,
                EmployerProfileId = c.EmployerProfileId,
                CompanyName = c.EmployerProfile.CompanyName,
                CandidateUserId = c.CandidateUserId,
                CandidateName = (c.CandidateUser.FirstName + " " + c.CandidateUser.LastName).Trim(),
                Status = c.Status,
                CreditDeducted = c.CreditDeducted,
                CreatedDate = c.CreatedDate,
            }).ToListAsync();

        return new PagedResult<AdminContactLogItemDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<ServiceResult<AdminEmployerOverviewDto>> GetEmployerOverviewAsync(int employerProfileId)
    {
        var employer = await _db.EmployerProfiles.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employerProfileId);
        if (employer is null) return ServiceResult<AdminEmployerOverviewDto>.Fail("NotFound", "Employer not found.");

        var subscription = await _billing.GetSubscriptionAsync(employerProfileId);
        var credits = await _billing.GetCreditsAsync(employerProfileId);
        var recentLogs = await GetContactLogsAsync(new AdminContactLogQuery { EmployerProfileId = employerProfileId, PageSize = 20 });

        return ServiceResult<AdminEmployerOverviewDto>.Ok(new AdminEmployerOverviewDto
        {
            EmployerProfileId = employer.Id,
            CompanyName = employer.CompanyName,
            Subscription = subscription,
            Credits = credits,
            RecentContactLogs = recentLogs.Items,
        });
    }

    public async Task<ServiceResult> AdjustCreditsAsync(ManualCreditAdjustmentRequest request, string adminUserId)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return ServiceResult.Fail("BadRequest", "A reason is required for manual credit adjustments.");

        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var credits = await _db.EmployerCredits.FirstOrDefaultAsync(c => c.EmployerProfileId == request.EmployerProfileId);
            if (credits is null)
            {
                credits = new EmployerCredits { EmployerProfileId = request.EmployerProfileId, CreatedDate = DateTime.UtcNow };
                _db.EmployerCredits.Add(credits);
            }

            credits.TotalCredits += request.Amount;
            if (credits.TotalCredits < credits.UsedCredits) credits.TotalCredits = credits.UsedCredits;
            credits.UpdatedDate = DateTime.UtcNow;

            _db.CreditTransactions.Add(new CreditTransaction
            {
                EmployerProfileId = request.EmployerProfileId,
                Type = "manual_adjustment",
                Amount = request.Amount,
                BalanceAfter = credits.CreditsRemaining,
                Notes = request.Reason,
                CreatedByUserId = adminUserId,
                CreatedDate = DateTime.UtcNow,
            });

            try
            {
                await _db.SaveChangesAsync();
                return ServiceResult.Ok();
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.State != EntityState.Unchanged))
                    entry.State = EntityState.Detached;
            }
        }

        return ServiceResult.Fail("ConcurrencyConflict", "Could not adjust credits due to a concurrent update. Please try again.");
    }

    public async Task<List<FraudFlagDto>> GetFraudFlagsAsync(int threshold = DefaultFraudThreshold)
    {
        var today = DateTime.UtcNow.Date;
        var flagged = await _db.EmployerContactLogs.AsNoTracking()
            .Where(c => c.CreatedDate >= today)
            .GroupBy(c => c.EmployerProfileId)
            .Select(g => new { EmployerProfileId = g.Key, Count = g.Count() })
            .Where(g => g.Count > threshold)
            .ToListAsync();

        if (flagged.Count == 0) return new List<FraudFlagDto>();

        var employerIds = flagged.Select(f => f.EmployerProfileId).ToList();
        var names = await _db.EmployerProfiles.AsNoTracking()
            .Where(e => employerIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.CompanyName);

        return flagged.Select(f => new FraudFlagDto
        {
            EmployerProfileId = f.EmployerProfileId,
            CompanyName = names.GetValueOrDefault(f.EmployerProfileId, "Unknown"),
            ContactsToday = f.Count,
            Threshold = threshold,
        }).ToList();
    }
}
