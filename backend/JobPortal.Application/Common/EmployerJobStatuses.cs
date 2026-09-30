namespace JobPortal.Application.Common;

/// <summary>
/// Lifecycle for EmployerJob.Status — a plain string column (same convention as ApplicationStatuses),
/// centralized so the moderation flow and the (future) public-search filter agree on the set.
///
/// Flow:
///   new posting, employer has NO prior admin-approved posting  -> PendingReview  (IsActive = true, hidden from public search)
///   new posting, employer HAS >= 1 admin-approved posting       -> Active         (auto-published)
///   admin approves a PendingReview posting                      -> Active         (ApprovedAt / ApprovedByUserId stamped)
///   admin rejects a PendingReview posting                       -> Rejected       (IsActive = false, RejectionReason set)
///   employer closes a posting                                   -> Closed         (IsActive = false)
/// </summary>
public static class EmployerJobStatuses
{
    /// <summary>Awaiting first-time admin moderation. Visible to the employer on their own dashboard;
    /// excluded from public listings and (once wired) the public slug lookup.</summary>
    public const string PendingReview = "PendingReview";

    /// <summary>Live and publicly visible.</summary>
    public const string Active = "Active";

    /// <summary>Admin rejected during moderation. Not publicly visible; not counted toward the
    /// employer's "trusted" status.</summary>
    public const string Rejected = "Rejected";

    /// <summary>Employer closed the posting.</summary>
    public const string Closed = "Closed";

    public static readonly string[] All = { PendingReview, Active, Rejected, Closed };
}
