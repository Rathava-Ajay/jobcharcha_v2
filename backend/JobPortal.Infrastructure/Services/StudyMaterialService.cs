using JobPortal.Application.Common;
using JobPortal.Application.DTOs.StudyMaterials;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class StudyMaterialService : IStudyMaterialService
{
    // MaterialType column convention owned by this service.
    private static readonly Dictionary<int, string> TypeLabels = new()
    {
        [1] = "Notes",
        [2] = "EBook",
        [3] = "Video",
        [4] = "Syllabus",
    };

    private static readonly Dictionary<string, int> TypeValues = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Notes"] = 1,
        ["EBook"] = 2,
        ["Video"] = 3,
        ["Syllabus"] = 4,
    };

    private readonly AppDbContext _db;

    public StudyMaterialService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<StudyMaterialDto>> SearchAsync(int? categoryId, string? materialType, string? search)
    {
        var query = _db.ExamMaterials.AsNoTracking().Include(m => m.Category)
            .Where(m => m.IsActive).AsQueryable();
        if (categoryId.HasValue) query = query.Where(m => m.CategoryId == categoryId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(m => EF.Functions.Like(m.Title, $"%{s}%") || EF.Functions.Like(m.Description, $"%{s}%"));
        }

        var materials = await query.OrderByDescending(m => m.CreatedDate).ToListAsync();
        var dtos = materials.Select(ToDto).ToList();

        if (!string.IsNullOrWhiteSpace(materialType))
            dtos = dtos.Where(d => string.Equals(d.MaterialType, materialType, StringComparison.OrdinalIgnoreCase)).ToList();

        return dtos;
    }

    public async Task<string?> RegisterDownloadAsync(string slug)
    {
        var material = await _db.ExamMaterials.FirstOrDefaultAsync(m => m.Slug == slug && m.IsActive);
        if (material is null) return null;
        material.DownloadCount += 1;
        await _db.SaveChangesAsync();
        return material.FilePath;
    }

    public async Task<List<StudyMaterialDto>> GetAllForAdminAsync()
    {
        var materials = await _db.ExamMaterials.AsNoTracking().Include(m => m.Category)
            .OrderByDescending(m => m.CreatedDate).ToListAsync();
        return materials.Select(ToDto).ToList();
    }

    public async Task<ServiceResult<StudyMaterialDto>> CreateAsync(UpsertStudyMaterialRequest request)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new ExamMaterial
        {
            Title = request.Title,
            Slug = slug,
            CategoryId = request.CategoryId,
            Description = request.Description,
            MaterialType = TypeValues.TryGetValue(request.MaterialType, out var typeValue) ? typeValue : 1,
            FilePath = request.FilePath,
            FileSize = request.FileSize,
            DownloadCount = 0,
            IsActive = request.IsActive,
            CreatedDate = DateTime.UtcNow,
        };
        _db.ExamMaterials.Add(entity);
        await _db.SaveChangesAsync();
        await _db.Entry(entity).Reference(m => m.Category).LoadAsync();
        return ServiceResult<StudyMaterialDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<StudyMaterialDto>> UpdateAsync(int id, UpsertStudyMaterialRequest request)
    {
        var entity = await _db.ExamMaterials.Include(m => m.Category).FirstOrDefaultAsync(m => m.Id == id);
        if (entity is null) return ServiceResult<StudyMaterialDto>.Fail("NotFound", "Study material not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.Slug = slug;
        entity.CategoryId = request.CategoryId;
        entity.Description = request.Description;
        entity.MaterialType = TypeValues.TryGetValue(request.MaterialType, out var typeValue) ? typeValue : entity.MaterialType;
        entity.FilePath = request.FilePath;
        entity.FileSize = request.FileSize;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceResult<StudyMaterialDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.ExamMaterials.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Study material not found.");
        _db.ExamMaterials.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.ExamMaterials.AnyAsync(m => m.Slug == slug && m.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static StudyMaterialDto ToDto(ExamMaterial m) => new()
    {
        Id = m.Id,
        Title = m.Title,
        Slug = m.Slug,
        CategoryId = m.CategoryId,
        CategoryName = m.Category?.Name ?? "General",
        Description = m.Description,
        MaterialType = TypeLabels.TryGetValue(m.MaterialType, out var label) ? label : "Notes",
        FilePath = m.FilePath,
        FileSizeDisplay = FormatFileSize(m.FileSize),
        DownloadCount = m.DownloadCount,
    };

    private static string FormatFileSize(long bytes)
    {
        if (bytes >= 1024 * 1024) return $"{bytes / (1024.0 * 1024.0):0.#} MB";
        if (bytes >= 1024) return $"{bytes / 1024.0:0.#} KB";
        return $"{bytes} B";
    }
}
