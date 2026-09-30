using JobPortal.Application.Common;
using JobPortal.Application.DTOs.News;

namespace JobPortal.Application.Interfaces;

public interface INewsService
{
    Task<List<NewsListItemDto>> GetAllAsync(bool includeInactive = false);
    Task<NewsDto?> GetBySlugAsync(string slug);
    Task<NewsDto?> GetByIdAsync(int id);
    Task<ServiceResult<NewsDto>> CreateAsync(UpsertNewsRequest request, string userId);
    Task<ServiceResult<NewsDto>> UpdateAsync(int id, UpsertNewsRequest request, string userId);
    Task<ServiceResult> DeleteAsync(int id);
}
