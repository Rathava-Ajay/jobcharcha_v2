using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class ContentSourceService : IContentSourceService
{
    private readonly AppDbContext _db;

    public ContentSourceService(AppDbContext db) => _db = db;

    private static ContentSourceDto ToDto(ContentSource s) => new()
    {
        Id = s.Id, Category = s.Category, Name = s.Name, SourceType = s.SourceType,
        Url = s.Url, IsActive = s.IsActive, CreatedDate = s.CreatedDate,
    };

    private static string? Validate(UpsertContentSourceRequest r)
    {
        if (!ContentCategories.IsValid(r.Category?.Trim().ToLowerInvariant()))
            return $"Category must be one of: {string.Join(", ", ContentCategories.All)}.";
        if (string.IsNullOrWhiteSpace(r.Name) || string.IsNullOrWhiteSpace(r.Url)) return "Name and URL are required.";
        return null;
    }

    public async Task<List<ContentSourceDto>> GetAllAsync(string? category)
    {
        var q = _db.ContentSources.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(category)) q = q.Where(s => s.Category == category);
        return (await q.OrderBy(s => s.Category).ThenBy(s => s.Name).ToListAsync()).Select(ToDto).ToList();
    }

    public async Task<ServiceResult<ContentSourceDto>> CreateAsync(UpsertContentSourceRequest request)
    {
        var error = Validate(request);
        if (error is not null) return ServiceResult<ContentSourceDto>.Fail("Invalid", error);

        var entity = new ContentSource
        {
            Category = request.Category.Trim().ToLowerInvariant(), Name = request.Name.Trim(), SourceType = request.SourceType,
            Url = request.Url.Trim(), IsActive = request.IsActive, CreatedDate = DateTime.UtcNow,
        };
        _db.ContentSources.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceResult<ContentSourceDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<ContentSourceDto>> UpdateAsync(int id, UpsertContentSourceRequest request)
    {
        var error = Validate(request);
        if (error is not null) return ServiceResult<ContentSourceDto>.Fail("Invalid", error);

        var entity = await _db.ContentSources.FindAsync(id);
        if (entity is null) return ServiceResult<ContentSourceDto>.Fail("NotFound", "Source not found.");

        entity.Category = request.Category.Trim().ToLowerInvariant();
        entity.Name = request.Name.Trim();
        entity.SourceType = request.SourceType;
        entity.Url = request.Url.Trim();
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult<ContentSourceDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.ContentSources.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Source not found.");
        _db.ContentSources.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
