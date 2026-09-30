namespace JobPortal.Application.Common;

public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Employer = "Employer";
    public const string JobSeeker = "JobSeeker";
    public const string User = "User";

    public static readonly string[] All = { SuperAdmin, Admin, Employer, JobSeeker, User };
}
