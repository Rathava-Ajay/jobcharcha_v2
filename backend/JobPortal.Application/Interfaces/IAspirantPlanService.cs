using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Plans;

namespace JobPortal.Application.Interfaces;

public interface IAspirantPlanService
{
    Task<List<AspirantPlanDto>> GetAllAsync(bool includeInactive = false);
    Task<AspirantPlanDto?> GetByIdAsync(int id);
    Task<ServiceResult<AspirantPlanDto>> CreateAsync(UpsertAspirantPlanRequest request);
    Task<ServiceResult<AspirantPlanDto>> UpdateAsync(int id, UpsertAspirantPlanRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
