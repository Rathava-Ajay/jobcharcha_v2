using System.Collections.Concurrent;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobPortal.Infrastructure.Services;

public class EmployerContactService : IEmployerContactService
{
    private readonly AppDbContext _db;
    private readonly IBackgroundTaskQueue _taskQueue;

    /// <summary>
    /// Per-employer in-process lock around the balance-check-and-debit critical section below.
    /// EmployerCredits.RowVersion optimistic concurrency (retry loop below) is necessary but not
    /// sufficient on its own: under N genuinely parallel requests for the same employer (verified
    /// via EmployerContactServiceTests' N-parallel test, which reproducibly over-credited and let a
    /// DbUpdateConcurrencyException escape uncaught before this fix), too many readers can pile up
    /// on the same stale balance before any of them commits. A real "SELECT ... FOR UPDATE"/
    /// serializable-transaction row lock isn't something the EF Core InMemory test provider can
    /// exercise (raw SQL table hints and isolation levels are both relational-only, silently
    /// no-op'd on InMemory) — this in-process async lock is the EF-portable equivalent that's both
    /// correct for this app's actual single-instance deployment and provable in a unit test.
    /// EmployerCredits can still be written from outside this lock (e.g. an admin manual credit
    /// adjustment landing mid-request), which is exactly what the RowVersion retry loop remains
    /// for — the two are complementary, not redundant.
    /// </summary>
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> EmployerLocks = new();

    private static SemaphoreSlim GetEmployerLock(int employerProfileId) =>
        EmployerLocks.GetOrAdd(employerProfileId, static _ => new SemaphoreSlim(1, 1));

    public EmployerContactService(AppDbContext db, IBackgroundTaskQueue taskQueue)
    {
        _db = db;
        _taskQueue = taskQueue;
    }

    /// <summary>Mirrors TestService.HasAccessAsync's style: static, internal, db-parameterized so other
    /// services can call the gate check directly without DI'ing this service.</summary>
    internal static async Task<(bool PeriodValid, bool CreditValid)> CheckGateAsync(AppDbContext db, int employerProfileId)
    {
        var today = DateTime.UtcNow.Date;
        var periodValid = await db.EmployerSubscriptions.AsNoTracking()
            .AnyAsync(s => s.EmployerProfileId == employerProfileId && s.Status == "active" && s.EndDate.Date >= today);

        var credits = await db.EmployerCredits.AsNoTracking()
            .FirstOrDefaultAsync(c => c.EmployerProfileId == employerProfileId);
        var creditValid = credits is not null && (credits.IsUnlimited || credits.CreditsRemaining > 0);

        return (periodValid, creditValid);
    }

    public async Task<ContactCandidateResponse> AttemptContactAsync(int employerProfileId, string candidateUserId, string? initialMessage)
    {
        var alreadyContacted = await _db.EmployerContactLogs.AsNoTracking()
            .FirstOrDefaultAsync(c => c.EmployerProfileId == employerProfileId && c.CandidateUserId == candidateUserId && c.Status == "success");
        if (alreadyContacted is not null)
        {
            var candidate = await _db.AspNetUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == candidateUserId);
            var currentCredits = await _db.EmployerCredits.AsNoTracking().FirstOrDefaultAsync(c => c.EmployerProfileId == employerProfileId);
            return new ContactCandidateResponse
            {
                Allowed = true,
                Reason = "already_unlocked",
                Phone = candidate?.PhoneNumber,
                Email = candidate?.Email,
                CreditsRemaining = currentCredits?.CreditsRemaining ?? 0,
                IsUnlimited = currentCredits?.IsUnlimited ?? false,
            };
        }

        var employerLock = GetEmployerLock(employerProfileId);
        await employerLock.WaitAsync();
        try
        {
            return await CheckBalanceAndDebitAsync(employerProfileId, candidateUserId, initialMessage);
        }
        finally
        {
            employerLock.Release();
        }
    }

    /// <summary>Must only be called while holding the caller's per-employer lock — see the lock's
    /// doc comment for why that's the primary race protection and RowVersion is the backstop.</summary>
    private async Task<ContactCandidateResponse> CheckBalanceAndDebitAsync(int employerProfileId, string candidateUserId, string? initialMessage)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var credits = await _db.EmployerCredits.FirstOrDefaultAsync(c => c.EmployerProfileId == employerProfileId);
            credits ??= NewZeroCredits(employerProfileId);
            if (credits.Id == 0) _db.EmployerCredits.Add(credits);

            var today = DateTime.UtcNow.Date;
            var periodValid = await _db.EmployerSubscriptions.AsNoTracking()
                .AnyAsync(s => s.EmployerProfileId == employerProfileId && s.Status == "active" && s.EndDate.Date >= today);
            var creditValid = credits.IsUnlimited || credits.CreditsRemaining > 0;

            var creditsBefore = credits.CreditsRemaining;

            if (periodValid && creditValid)
            {
                if (!credits.IsUnlimited)
                {
                    credits.UsedCredits += 1;
                    credits.UpdatedDate = DateTime.UtcNow;
                }

                var creditsAfter = credits.CreditsRemaining;

                _db.CreditTransactions.Add(new CreditTransaction
                {
                    EmployerProfileId = employerProfileId,
                    Type = "contact_deduction",
                    Amount = credits.IsUnlimited ? 0 : -1,
                    BalanceAfter = creditsAfter,
                    CreatedDate = DateTime.UtcNow,
                });
                _db.EmployerContactLogs.Add(new EmployerContactLog
                {
                    EmployerProfileId = employerProfileId,
                    CandidateUserId = candidateUserId,
                    Status = "success",
                    CreditDeducted = !credits.IsUnlimited,
                    CreditsBefore = creditsBefore,
                    CreditsAfter = creditsAfter,
                    InitialMessage = initialMessage,
                    CreatedDate = DateTime.UtcNow,
                });

                try
                {
                    await _db.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    // Only reachable from outside this employer's lock — e.g. an admin manual
                    // credit adjustment landing mid-request — since two callers can no longer be
                    // in this method for the same employer at once. No `when (attempt < maxAttempts)`
                    // guard: that used to let the exception escape uncaught on the final attempt
                    // instead of resolving to a clean response.
                    foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.State != EntityState.Unchanged))
                        entry.State = EntityState.Detached;
                    if (attempt == maxAttempts) break;
                    continue;
                }

                var candidate = await _db.AspNetUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == candidateUserId);
                EnqueueContactConfirmationEmail(employerProfileId, candidate?.FirstName);

                return new ContactCandidateResponse
                {
                    Allowed = true,
                    Reason = "success",
                    Phone = candidate?.PhoneNumber,
                    Email = candidate?.Email,
                    CreditsRemaining = creditsAfter,
                    IsUnlimited = credits.IsUnlimited,
                };
            }
            else
            {
                var reason = !periodValid && !creditValid ? "blocked_both" : !periodValid ? "blocked_expired" : "blocked_no_credits";
                _db.EmployerContactLogs.Add(new EmployerContactLog
                {
                    EmployerProfileId = employerProfileId,
                    CandidateUserId = candidateUserId,
                    Status = reason,
                    CreditDeducted = false,
                    CreditsBefore = creditsBefore,
                    CreditsAfter = creditsBefore,
                    InitialMessage = initialMessage,
                    CreatedDate = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync();

                return new ContactCandidateResponse
                {
                    Allowed = false,
                    Reason = reason,
                    CreditsRemaining = credits.CreditsRemaining,
                    IsUnlimited = credits.IsUnlimited,
                };
            }
        }

        return new ContactCandidateResponse { Allowed = false, Reason = "blocked_no_credits", CreditsRemaining = 0 };
    }

    public async Task<PagedResult<ContactHistoryItemDto>> GetHistoryAsync(int employerProfileId, int page = 1, int pageSize = 20)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var q = _db.EmployerContactLogs.AsNoTracking().Include(c => c.CandidateUser)
            .Where(c => c.EmployerProfileId == employerProfileId)
            .OrderByDescending(c => c.CreatedDate);

        var totalCount = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).Select(c => new ContactHistoryItemDto
        {
            Id = c.Id,
            CandidateUserId = c.CandidateUserId,
            CandidateName = (c.CandidateUser.FirstName + " " + c.CandidateUser.LastName).Trim(),
            Status = c.Status,
            CreditDeducted = c.CreditDeducted,
            InitialMessage = c.InitialMessage,
            CreatedDate = c.CreatedDate,
        }).ToListAsync();

        return new PagedResult<ContactHistoryItemDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    private static EmployerCredits NewZeroCredits(int employerProfileId) => new()
    {
        EmployerProfileId = employerProfileId,
        TotalCredits = 0,
        UsedCredits = 0,
        IsUnlimited = false,
        CreatedDate = DateTime.UtcNow,
    };

    private void EnqueueContactConfirmationEmail(int employerProfileId, string? candidateFirstName)
    {
        _taskQueue.QueueBackgroundWorkItem(async (sp, ct) =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var emailSender = sp.GetRequiredService<IEmailSender>();
            var employer = await db.EmployerProfiles.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employerProfileId, ct);
            if (employer is null || string.IsNullOrWhiteSpace(employer.ContactEmail)) return;

            await emailSender.SendAsync(employer.ContactEmail,
                "Contact unlocked on JobCharcha",
                $"You unlocked contact details for {candidateFirstName ?? "a candidate"}. Check your Contact History on the employer dashboard for details.");
        });
    }
}
