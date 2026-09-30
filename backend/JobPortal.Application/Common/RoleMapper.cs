namespace JobPortal.Application.Common;

/// <summary>
/// Translates between the frontend's UserProfile.role values and the DB role names
/// seeded in AspNetRoles (Admin, SuperAdmin, Employer, JobSeeker, User).
/// </summary>
public static class RoleMapper
{
    public static string ToDbRole(string uiRole) => uiRole.ToLowerInvariant() switch
    {
        "aspirant" => AppRoles.JobSeeker,
        "employer" => AppRoles.Employer,
        "admin" => AppRoles.Admin,
        "superadmin" => AppRoles.SuperAdmin,
        "user" => AppRoles.User,
        _ => throw new ArgumentOutOfRangeException(nameof(uiRole), uiRole, "Unknown UI role")
    };

    public static string ToUiRole(string? dbRole) => dbRole switch
    {
        AppRoles.JobSeeker => "aspirant",
        AppRoles.Employer => "employer",
        AppRoles.Admin => "admin",
        AppRoles.SuperAdmin => "superadmin",
        AppRoles.User => "user",
        _ => "user"
    };

    public static bool IsPubliclyRegisterable(string uiRole) =>
        uiRole.Equals("aspirant", StringComparison.OrdinalIgnoreCase) ||
        uiRole.Equals("employer", StringComparison.OrdinalIgnoreCase);

    // Highest-privilege role wins when a user holds more than one (e.g. Admin + SuperAdmin).
    private static readonly string[] RolePriority = { AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Employer, AppRoles.JobSeeker, AppRoles.User };

    /// <summary>
    /// Resolves a user's effective DB role name from their real Identity role assignments
    /// (AspNetUserRoles) — the only source of truth for role membership in this app.
    /// </summary>
    public static string ResolveDbRole(IEnumerable<string?> assignedRoleNames)
    {
        var assigned = assignedRoleNames.Where(n => n is not null).ToHashSet();
        return RolePriority.FirstOrDefault(assigned.Contains) ?? AppRoles.User;
    }
}
