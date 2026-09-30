using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;

namespace JobPortal.Application.Interfaces;

public interface IEmployerPlanService
{
    Task<List<EmployerPlanDto>> GetAllAsync(bool includeInactive = false);
    Task<EmployerPlanDto?> GetByIdAsync(int id);
    Task<ServiceResult<EmployerPlanDto>> CreateAsync(UpsertEmployerPlanRequest request);
    Task<ServiceResult<EmployerPlanDto>> UpdateAsync(int id, UpsertEmployerPlanRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
