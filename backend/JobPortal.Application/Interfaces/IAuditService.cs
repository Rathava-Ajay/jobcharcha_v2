using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.Interfaces;

public interface IAuditService
{
    /// <summary>Records one end-user activity event. Never throws — an audit-write failure is
    /// swallowed so it can't break the action being audited. Call it *after* the primary
    /// SaveChangesAsync so the event is only recorded once the action actually committed.</summary>
    Task LogAsync(AuditEntry entry, CancellationToken ct = default);

    /// <summary>Admin read-back: newest-first, filtered + paged.</summary>
    Task<PagedResult<AuditEventDto>> QueryAsync(AuditQuery query);

    /// <summary>Signup counts grouped by <c>AspNetUser.SignupSource</c> (null ⇒ "organic"),
    /// optionally windowed by registration date — powers the campaign attribution report.</summary>
    Task<List<SignupSourceStatDto>> GetSignupSourceBreakdownAsync(DateTime? from, DateTime? to);
}
