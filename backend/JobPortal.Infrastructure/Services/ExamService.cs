using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class ExamService : IExamService
{
    private readonly AppDbContext _db;

    public ExamService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ExamDto>> GetAllAsync(int? categoryId = null)
    {
        var query = _db.Exams.AsNoTracking().Include(e => e.Category).Where(e => e.IsActive).AsQueryable();
        if (categoryId.HasValue) query = query.Where(e => e.CategoryId == categoryId.Value);

        var exams = await query.OrderBy(e => e.DisplayOrder).ThenBy(e => e.Name).ToListAsync();
        var testCounts = await _db.Tests.AsNoTracking()
            .Where(t => t.IsActive)
            .GroupBy(t => t.ExamId)
            .Select(g => new { ExamId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ExamId, x => x.Count);

        return exams.Select(e => ToDto(e, testCounts.TryGetValue(e.Id, out var c) ? c : 0)).ToList();
    }

    public async Task<List<ExamDto>> GetAllForAdminAsync()
    {
        var exams = await _db.Exams.AsNoTracking().Include(e => e.Category)
            .OrderBy(e => e.DisplayOrder).ThenBy(e => e.Name).ToListAsync();
        var testCounts = await _db.Tests.AsNoTracking()
            .Where(t => !t.IsDeleted)
            .GroupBy(t => t.ExamId)
            .Select(g => new { ExamId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ExamId, x => x.Count);

        return exams.Select(e => ToDto(e, testCounts.TryGetValue(e.Id, out var c) ? c : 0)).ToList();
    }

    public async Task<ExamDto?> GetByIdAsync(int id)
    {
        var exam = await _db.Exams.AsNoTracking().Include(e => e.Category).FirstOrDefaultAsync(e => e.Id == id);
        if (exam is null) return null;
        var testCount = await _db.Tests.AsNoTracking().CountAsync(t => t.ExamId == id && t.IsActive);
        return ToDto(exam, testCount);
    }

    public async Task<ServiceResult<ExamDto>> CreateAsync(UpsertExamRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Name) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new Exam
        {
            Name = request.Name,
            NameGujarati = request.NameGujarati,
            Slug = slug,
            Description = request.Description,
            LogoUrl = request.LogoUrl,
            CategoryId = request.CategoryId,
            FreeTestsAllowed = request.FreeTestsAllowed,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            Status = 1,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
        };
        _db.Exams.Add(entity);
        await _db.SaveChangesAsync();
        var saved = await _db.Exams.AsNoTracking().Include(e => e.Category).FirstAsync(e => e.Id == entity.Id);
        return ServiceResult<ExamDto>.Ok(ToDto(saved, 0));
    }

    public async Task<ServiceResult<ExamDto>> UpdateAsync(int id, UpsertExamRequest request)
    {
        var entity = await _db.Exams.FindAsync(id);
        if (entity is null) return ServiceResult<ExamDto>.Fail("NotFound", "Exam not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Name) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Name = request.Name;
        entity.NameGujarati = request.NameGujarati;
        entity.Slug = slug;
        entity.Description = request.Description;
        entity.LogoUrl = request.LogoUrl;
        entity.CategoryId = request.CategoryId;
        entity.FreeTestsAllowed = request.FreeTestsAllowed;
        entity.DisplayOrder = request.DisplayOrder;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var saved = await _db.Exams.AsNoTracking().Include(e => e.Category).FirstAsync(e => e.Id == id);
        var testCount = await _db.Tests.AsNoTracking().CountAsync(t => t.ExamId == id && t.IsActive);
        return ServiceResult<ExamDto>.Ok(ToDto(saved, testCount));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.Exams.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Exam not found.");
        var hasTests = await _db.Tests.AnyAsync(t => t.ExamId == id && !t.IsDeleted);
        if (hasTests) return ServiceResult.Fail("HasTests", "Cannot delete an exam that has tests. Delete or reassign its tests first.");
        _db.Exams.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Exams.AnyAsync(e => e.Slug == slug && e.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static ExamDto ToDto(Exam e, int testCount) => new()
    {
        Id = e.Id,
        Name = e.Name,
        NameGujarati = e.NameGujarati,
        Slug = e.Slug,
        Description = e.Description,
        LogoUrl = e.LogoUrl,
        CategoryId = e.CategoryId,
        CategoryName = e.Category?.Name,
        CategorySlug = e.Category?.Slug,
        FreeTestsAllowed = e.FreeTestsAllowed,
        DisplayOrder = e.DisplayOrder,
        IsActive = e.IsActive,
        TestCount = testCount,
    };
}
