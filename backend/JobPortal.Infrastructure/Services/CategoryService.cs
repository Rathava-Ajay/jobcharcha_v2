using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Categories;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CategoryDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.Categories.AsNoTracking();
        if (!includeInactive) query = query.Where(c => c.IsActive);

        var raw = await query
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new { Category = c, JobCount = c.Jobs.Count(j => j.IsActive) })
            .ToListAsync();
        return raw.Select(x => ToDto(x.Category, x.JobCount)).ToList();
    }

    public async Task<List<CategoryDto>> GetFeaturedAsync()
    {
        var raw = await _db.Categories.AsNoTracking()
            .Where(c => c.IsActive && c.ShowOnHomepage)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new { Category = c, JobCount = c.Jobs.Count(j => j.IsActive) })
            .ToListAsync();
        return raw.Select(x => ToDto(x.Category, x.JobCount)).ToList();
    }

    public async Task<CategoryDto?> GetBySlugAsync(string slug)
    {
        var c = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slug);
        if (c is null) return null;
        var jobCount = await _db.Jobs.CountAsync(j => j.CategoryId == c.Id && j.IsActive);
        return ToDto(c, jobCount);
    }

    public async Task<CategoryDto?> GetByIdAsync(int id)
    {
        var c = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (c is null) return null;
        var jobCount = await _db.Jobs.CountAsync(j => j.CategoryId == id && j.IsActive);
        return ToDto(c, jobCount);
    }

    public async Task<ServiceResult<CategoryDto>> CreateAsync(UpsertCategoryRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Name) : Slugify(request.Slug);
        if (await _db.Categories.AnyAsync(c => c.Slug == slug))
            return ServiceResult<CategoryDto>.Fail("SlugTaken", "A category with this slug already exists.");

        var entity = new Category
        {
            Name = request.Name,
            NameGujarati = request.NameGujarati,
            Slug = slug,
            Description = request.Description,
            Icon = request.Icon,
            DisplayOrder = request.DisplayOrder,
            ShowOnHomepage = request.ShowOnHomepage,
            IsActive = request.IsActive,
            MetaTitle = request.MetaTitle,
            MetaDescription = request.MetaDescription,
            MetaKeywords = request.MetaKeywords,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
        };
        _db.Categories.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceResult<CategoryDto>.Ok(ToDto(entity, 0));
    }

    public async Task<ServiceResult<CategoryDto>> UpdateAsync(int id, UpsertCategoryRequest request, string userId)
    {
        var entity = await _db.Categories.FindAsync(id);
        if (entity is null) return ServiceResult<CategoryDto>.Fail("NotFound", "Category not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Name) : Slugify(request.Slug);
        if (slug != entity.Slug && await _db.Categories.AnyAsync(c => c.Slug == slug && c.Id != id))
            return ServiceResult<CategoryDto>.Fail("SlugTaken", "A category with this slug already exists.");

        entity.Name = request.Name;
        entity.NameGujarati = request.NameGujarati;
        entity.Slug = slug;
        entity.Description = request.Description;
        entity.Icon = request.Icon;
        entity.DisplayOrder = request.DisplayOrder;
        entity.ShowOnHomepage = request.ShowOnHomepage;
        entity.IsActive = request.IsActive;
        entity.MetaTitle = request.MetaTitle;
        entity.MetaDescription = request.MetaDescription;
        entity.MetaKeywords = request.MetaKeywords;
        entity.UpdatedById = userId;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var jobCount = await _db.Jobs.CountAsync(j => j.CategoryId == id && j.IsActive);
        return ServiceResult<CategoryDto>.Ok(ToDto(entity, jobCount));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.Categories.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Category not found.");

        var hasJobs = await _db.Jobs.AnyAsync(j => j.CategoryId == id);
        if (hasJobs)
            return ServiceResult.Fail("HasJobs", "Cannot delete a category that still has jobs. Deactivate it instead.");

        _db.Categories.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("--", "-");

    private static CategoryDto ToDto(Category c, int jobCount) => new()
    {
        Id = c.Id,
        Name = c.Name,
        NameGujarati = c.NameGujarati,
        Slug = c.Slug,
        Description = c.Description,
        Icon = c.Icon,
        DisplayOrder = c.DisplayOrder,
        ShowOnHomepage = c.ShowOnHomepage,
        HomepageJobCount = c.HomepageJobCount,
        IsActive = c.IsActive,
        JobCount = jobCount,
        MetaTitle = c.MetaTitle,
        MetaDescription = c.MetaDescription,
        MetaKeywords = c.MetaKeywords,
    };
}
