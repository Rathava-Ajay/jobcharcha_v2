using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class EmployerPlanService : IEmployerPlanService
{
    private readonly AppDbContext _db;

    public EmployerPlanService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<EmployerPlanDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.EmployerPlans.AsNoTracking().AsQueryable();
        if (!includeInactive) query = query.Where(p => p.IsActive);

        var items = await query.OrderBy(p => p.DisplayOrder).ThenBy(p => p.Price).ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<EmployerPlanDto?> GetByIdAsync(int id)
    {
        var entity = await _db.EmployerPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<ServiceResult<EmployerPlanDto>> CreateAsync(UpsertEmployerPlanRequest request)
    {
        var entity = new EmployerPlan
        {
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            DurationDays = request.DurationDays,
            IsTopUp = request.IsTopUp,
            IncludedCredits = request.IncludedCredits,
            IsUnlimitedCredits = request.IsUnlimitedCredits,
            MaxActiveJobs = request.MaxActiveJobs,
            MaxFeaturedJobs = request.MaxFeaturedJobs,
            CanAccessResumes = request.CanAccessResumes,
            ResumeViewsPerMonth = request.ResumeViewsPerMonth,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            CreatedDate = DateTime.UtcNow,
        };
        _db.EmployerPlans.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceResult<EmployerPlanDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<EmployerPlanDto>> UpdateAsync(int id, UpsertEmployerPlanRequest request)
    {
        var entity = await _db.EmployerPlans.FindAsync(id);
        if (entity is null) return ServiceResult<EmployerPlanDto>.Fail("NotFound", "Plan not found.");

        entity.Name = request.Name;
        entity.Description = request.Description;
        entity.Price = request.Price;
        entity.DurationDays = request.DurationDays;
        entity.IsTopUp = request.IsTopUp;
        entity.IncludedCredits = request.IncludedCredits;
        entity.IsUnlimitedCredits = request.IsUnlimitedCredits;
        entity.MaxActiveJobs = request.MaxActiveJobs;
        entity.MaxFeaturedJobs = request.MaxFeaturedJobs;
        entity.CanAccessResumes = request.CanAccessResumes;
        entity.ResumeViewsPerMonth = request.ResumeViewsPerMonth;
        entity.DisplayOrder = request.DisplayOrder;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceResult<EmployerPlanDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.EmployerPlans.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Plan not found.");
        _db.EmployerPlans.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static EmployerPlanDto ToDto(EmployerPlan p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        Price = p.Price,
        DurationDays = p.DurationDays,
        IsTopUp = p.IsTopUp,
        IncludedCredits = p.IncludedCredits,
        IsUnlimitedCredits = p.IsUnlimitedCredits,
        MaxActiveJobs = p.MaxActiveJobs,
        MaxFeaturedJobs = p.MaxFeaturedJobs,
        CanAccessResumes = p.CanAccessResumes,
        ResumeViewsPerMonth = p.ResumeViewsPerMonth,
        DisplayOrder = p.DisplayOrder,
        IsActive = p.IsActive,
    };
}
