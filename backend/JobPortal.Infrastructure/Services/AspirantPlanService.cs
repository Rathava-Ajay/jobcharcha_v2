using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Plans;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class AspirantPlanService : IAspirantPlanService
{
    private readonly AppDbContext _db;

    public AspirantPlanService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AspirantPlanDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.AspirantPlans.AsNoTracking().AsQueryable();
        if (!includeInactive) query = query.Where(p => p.IsActive);

        var items = await query.OrderBy(p => p.DisplayOrder).ThenBy(p => p.Price).ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<AspirantPlanDto?> GetByIdAsync(int id)
    {
        var entity = await _db.AspirantPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<ServiceResult<AspirantPlanDto>> CreateAsync(UpsertAspirantPlanRequest request)
    {
        var entity = new AspirantPlan
        {
            Name = request.Name,
            NameGujarati = request.NameGujarati,
            Description = request.Description,
            Price = request.Price,
            DurationDays = request.DurationDays,
            UnlocksAllTests = request.UnlocksAllTests,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            CreatedDate = DateTime.UtcNow,
        };
        _db.AspirantPlans.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceResult<AspirantPlanDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<AspirantPlanDto>> UpdateAsync(int id, UpsertAspirantPlanRequest request)
    {
        var entity = await _db.AspirantPlans.FindAsync(id);
        if (entity is null) return ServiceResult<AspirantPlanDto>.Fail("NotFound", "Plan not found.");

        entity.Name = request.Name;
        entity.NameGujarati = request.NameGujarati;
        entity.Description = request.Description;
        entity.Price = request.Price;
        entity.DurationDays = request.DurationDays;
        entity.UnlocksAllTests = request.UnlocksAllTests;
        entity.DisplayOrder = request.DisplayOrder;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceResult<AspirantPlanDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.AspirantPlans.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Plan not found.");
        _db.AspirantPlans.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static AspirantPlanDto ToDto(AspirantPlan p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        NameGujarati = p.NameGujarati,
        Description = p.Description,
        Price = p.Price,
        DurationDays = p.DurationDays,
        UnlocksAllTests = p.UnlocksAllTests,
        DisplayOrder = p.DisplayOrder,
        IsActive = p.IsActive,
    };
}
