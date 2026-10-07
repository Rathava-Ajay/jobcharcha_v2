using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.GovtSchemes;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class GovtSchemeService : IGovtSchemeService
{
    private readonly AppDbContext _db;
    private readonly ISocialShareService? _social;

    public GovtSchemeService(AppDbContext db, ISocialShareService? social = null)
    {
        _db = db;
        _social = social;
    }

    private Task ShareAsync(int id, bool skip, string userId) =>
        _social is null ? Task.CompletedTask : _social.EnqueueAsync(ContentCategories.Scheme, id, skip, userId);

    public async Task<List<GovtSchemeListItemDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.GovtSchemes.AsNoTracking().AsQueryable();
        if (!includeInactive) query = query.Where(s => s.IsActive);

        var items = await query.OrderByDescending(s => s.IsFeatured).ThenBy(s => s.DisplayOrder).ThenByDescending(s => s.CreatedDate).ToListAsync();
        return items.Select(ToListItemDto).ToList();
    }

    public async Task<GovtSchemeDto?> GetBySlugAsync(string slug)
    {
        var entity = await _db.GovtSchemes.AsNoTracking().FirstOrDefaultAsync(s => s.Slug == slug && s.IsActive);
        return entity is null ? null : ToFullDto(entity);
    }

    public async Task<GovtSchemeDto?> GetByIdAsync(int id)
    {
        var entity = await _db.GovtSchemes.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        return entity is null ? null : ToFullDto(entity);
    }

    public async Task<ServiceResult<GovtSchemeDto>> CreateAsync(UpsertGovtSchemeRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new GovtScheme
        {
            Title = request.Title,
            TitleGujarati = request.TitleGujarati,
            Slug = slug,
            Ministry = request.Ministry,
            Category = request.Category,
            Eligibility = request.Eligibility,
            Benefits = request.Benefits,
            Description = request.Description,
            ApplyLink = request.ApplyLink,
            OfficialNotificationUrl = request.OfficialNotificationUrl,
            IsFeatured = request.IsFeatured,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
        };
        _db.GovtSchemes.Add(entity);
        await _db.SaveChangesAsync();
        if (entity.IsActive) await ShareAsync(entity.Id, request.SkipSocial, userId);
        return ServiceResult<GovtSchemeDto>.Ok(ToFullDto(entity));
    }

    public async Task<ServiceResult<GovtSchemeDto>> UpdateAsync(int id, UpsertGovtSchemeRequest request, string userId)
    {
        var entity = await _db.GovtSchemes.FindAsync(id);
        if (entity is null) return ServiceResult<GovtSchemeDto>.Fail("NotFound", "Government scheme not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.TitleGujarati = request.TitleGujarati;
        entity.Slug = slug;
        entity.Ministry = request.Ministry;
        entity.Category = request.Category;
        entity.Eligibility = request.Eligibility;
        entity.Benefits = request.Benefits;
        entity.Description = request.Description;
        entity.ApplyLink = request.ApplyLink;
        entity.OfficialNotificationUrl = request.OfficialNotificationUrl;
        entity.IsFeatured = request.IsFeatured;
        entity.DisplayOrder = request.DisplayOrder;
        var wasActive = entity.IsActive;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        if (request.IsActive && !wasActive) await ShareAsync(entity.Id, request.SkipSocial, userId);
        return ServiceResult<GovtSchemeDto>.Ok(ToFullDto(entity));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.GovtSchemes.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Government scheme not found.");
        _db.GovtSchemes.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.GovtSchemes.AnyAsync(s => s.Slug == slug && s.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static GovtSchemeListItemDto ToListItemDto(GovtScheme s) => new()
    {
        Id = s.Id,
        Title = s.Title,
        Slug = s.Slug,
        Ministry = s.Ministry,
        Category = s.Category,
        Eligibility = s.Eligibility,
        Benefits = s.Benefits,
        ApplyLink = s.ApplyLink,
        IsFeatured = s.IsFeatured,
    };

    private static GovtSchemeDto ToFullDto(GovtScheme s) => new()
    {
        Id = s.Id,
        Title = s.Title,
        TitleGujarati = s.TitleGujarati,
        Slug = s.Slug,
        Ministry = s.Ministry,
        Category = s.Category,
        Eligibility = s.Eligibility,
        Benefits = s.Benefits,
        Description = s.Description,
        ApplyLink = s.ApplyLink,
        OfficialNotificationUrl = s.OfficialNotificationUrl,
        IsFeatured = s.IsFeatured,
        DisplayOrder = s.DisplayOrder,
    };
}
