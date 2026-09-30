using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Store;

namespace JobPortal.Application.Interfaces;

public interface IProductService
{
    Task<List<ProductDto>> SearchAsync(string? category, string? pricing, string? search);
    Task<ProductDto?> GetBySlugAsync(string slug);
    Task<List<ProductDto>> GetAllForAdminAsync();
    Task<ServiceResult<ProductDto>> CreateAsync(UpsertProductRequest request);
    Task<ServiceResult<ProductDto>> UpdateAsync(int id, UpsertProductRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
