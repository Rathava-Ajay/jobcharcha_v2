using JobPortal.Application.Common;
using JobPortal.Application.DTOs.GovtSchemes;

namespace JobPortal.Application.Interfaces;

public interface IGovtSchemeService
{
    Task<List<GovtSchemeListItemDto>> GetAllAsync(bool includeInactive = false);
    Task<GovtSchemeDto?> GetBySlugAsync(string slug);
    Task<GovtSchemeDto?> GetByIdAsync(int id);
    Task<ServiceResult<GovtSchemeDto>> CreateAsync(UpsertGovtSchemeRequest request, string userId);
    Task<ServiceResult<GovtSchemeDto>> UpdateAsync(int id, UpsertGovtSchemeRequest request, string userId);
    Task<ServiceResult> DeleteAsync(int id);
}
