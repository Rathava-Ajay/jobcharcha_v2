namespace JobPortal.Application.Interfaces;

/// <summary>Resolves the calling user's EmployerProfile.Id from their AspNetUser id — the one small
/// DB lookup every employer-scoped controller needs before delegating to the real services, kept in
/// its own tiny service so controllers never touch AppDbContext directly (this codebase's controllers
/// are service-only, no repository/DbContext access).</summary>
public interface IEmployerContextService
{
    Task<int?> ResolveEmployerProfileIdAsync(string userId);
}
