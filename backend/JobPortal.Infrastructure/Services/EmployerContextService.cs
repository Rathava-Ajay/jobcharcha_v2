using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class EmployerContextService : IEmployerContextService
{
    private readonly AppDbContext _db;

    public EmployerContextService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<int?> ResolveEmployerProfileIdAsync(string userId)
    {
        var id = await _db.EmployerProfiles.AsNoTracking().Where(e => e.UserId == userId).Select(e => (int?)e.Id).FirstOrDefaultAsync();
        return id;
    }
}
