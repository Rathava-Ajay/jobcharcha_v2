using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Categories;

namespace JobPortal.Application.Interfaces;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync(bool includeInactive = false);
    Task<List<CategoryDto>> GetFeaturedAsync();
    Task<CategoryDto?> GetBySlugAsync(string slug);
    Task<CategoryDto?> GetByIdAsync(int id);
    Task<ServiceResult<CategoryDto>> CreateAsync(UpsertCategoryRequest request, string userId);
    Task<ServiceResult<CategoryDto>> UpdateAsync(int id, UpsertCategoryRequest request, string userId);
    Task<ServiceResult> DeleteAsync(int id);
}
