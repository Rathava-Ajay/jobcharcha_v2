using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Blogs;

namespace JobPortal.Application.Interfaces;

public interface IBlogService
{
    Task<List<BlogListItemDto>> GetAllAsync(bool includeInactive = false);
    Task<BlogDto?> GetBySlugAsync(string slug);
    Task<BlogDto?> GetByIdAsync(int id);
    Task<ServiceResult<BlogDto>> CreateAsync(UpsertBlogRequest request, string userId);
    Task<ServiceResult<BlogDto>> UpdateAsync(int id, UpsertBlogRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
