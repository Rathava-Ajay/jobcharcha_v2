using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Aspirant;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class SavedJobService : ISavedJobService
{
    private readonly AppDbContext _db;

    public SavedJobService(AppDbContext db) => _db = db;

    public async Task<List<SavedJobDto>> GetMineAsync(string userId)
    {
        // Join to EmployerJobs so a bookmarked posting that was closed/removed simply drops out of the list.
        var rows = await (
            from s in _db.SavedJobs.AsNoTracking()
            where s.UserId == userId
            join j in _db.EmployerJobs.AsNoTracking() on s.EmployerJobId equals j.Id
            where j.IsActive && j.Status == EmployerJobStatuses.Active
            join p in _db.EmployerProfiles.AsNoTracking() on j.EmployerProfileId equals p.Id
            orderby s.CreatedAt descending
            select new { s, j, CompanyName = p.CompanyName })
            .ToListAsync();

        var jobIds = rows.Select(r => r.j.Id).ToList();
        var appliedIds = await _db.JobApplications.AsNoTracking()
            .Where(a => a.ApplicantUserId == userId && jobIds.Contains(a.EmployerJobId))
            .Select(a => a.EmployerJobId)
            .ToListAsync();
        var appliedSet = appliedIds.ToHashSet();

        return rows.Select(r => new SavedJobDto
        {
            EmployerJobId = r.j.Id,
            Title = r.j.Title,
            Slug = r.j.Slug,
            CompanyName = r.CompanyName,
            City = r.j.City,
            State = r.j.State,
            JobType = r.j.JobType,
            WorkMode = r.j.WorkMode,
            LastDate = r.j.LastDate,
            HasApplied = appliedSet.Contains(r.j.Id),
            SavedAt = r.s.CreatedAt,
        }).ToList();
    }

    public async Task<List<int>> GetMyIdsAsync(string userId) =>
        await _db.SavedJobs.AsNoTracking()
            .Where(s => s.UserId == userId)
            .Select(s => s.EmployerJobId)
            .ToListAsync();

    public async Task<ServiceResult> SaveAsync(string userId, int employerJobId)
    {
        var jobExists = await _db.EmployerJobs.AnyAsync(j => j.Id == employerJobId);
        if (!jobExists) return ServiceResult.Fail("NotFound", "This job posting no longer exists.");

        if (await _db.SavedJobs.AnyAsync(s => s.UserId == userId && s.EmployerJobId == employerJobId))
            return ServiceResult.Ok();

        _db.SavedJobs.Add(new SavedJob
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EmployerJobId = employerJobId,
            CreatedAt = DateTime.UtcNow,
        });

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Lost a race with a parallel save of the same job — that's the desired end state.
        }
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> UnsaveAsync(string userId, int employerJobId)
    {
        var row = await _db.SavedJobs.FirstOrDefaultAsync(s => s.UserId == userId && s.EmployerJobId == employerJobId);
        if (row is not null)
        {
            _db.SavedJobs.Remove(row);
            await _db.SaveChangesAsync();
        }
        return ServiceResult.Ok();
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
}
