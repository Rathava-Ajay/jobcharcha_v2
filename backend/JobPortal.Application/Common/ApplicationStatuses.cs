namespace JobPortal.Application.Common;

/// <summary>
/// The real hiring-flow lifecycle for JobApplication.Status — a plain string column (matching this
/// codebase's established convention for status fields, e.g. AspirantPayment/Order/Subscription),
/// not an EF-mapped enum, but centralized here instead of scattered string literals so employer
/// status updates can be validated against a known set.
///
/// Pipeline shown to aspirants: Applied → Under Review → Shortlisted → Interview → Selected,
/// with Rejected as a terminal state reachable from any stage.
/// </summary>
public static class ApplicationStatuses
{
    /// <summary>Set automatically by JobApplicationService.ApplyAsync — never chosen by an employer.</summary>
    public const string Applied = "Applied";

    /// <summary>Set automatically the first time an employer opens the applicant list for a job —
    /// never chosen directly by an employer, and never overwrites a later stage.</summary>
    public const string UnderReview = "UnderReview";

    public const string Shortlisted = "Shortlisted";
    public const string Interview = "Interview";
    public const string Selected = "Selected";
    public const string Rejected = "Rejected";

    public static readonly string[] All = { Applied, UnderReview, Shortlisted, Interview, Selected, Rejected };

    /// <summary>Statuses an employer can set directly via UpdateStatusAsync — excludes Applied/UnderReview,
    /// which the system manages on its own.</summary>
    public static readonly string[] EmployerSettable = { Shortlisted, Interview, Selected, Rejected };
}
