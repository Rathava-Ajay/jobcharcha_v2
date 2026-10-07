using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.News;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class NewsService : INewsService
{
    private readonly AppDbContext _db;
    private readonly ISocialShareService? _social;

    public NewsService(AppDbContext db, ISocialShareService? social = null)
    {
        _db = db;
        _social = social;
    }

    private Task ShareAsync(int id, bool skip, string userId) =>
        _social is null ? Task.CompletedTask : _social.EnqueueAsync(ContentCategories.News, id, skip, userId);

    /// <summary>How long a news item keeps its "Breaking" badge after it is published.</summary>
    public const int BreakingDays = 7;

    private static bool IsStillBreaking(News n) => n.IsBreaking && n.PublishedDate >= DateTime.UtcNow.Date.AddDays(-BreakingDays);

    public async Task<List<NewsListItemDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.News.AsNoTracking().Include(n => n.Category).AsQueryable();
        if (!includeInactive) query = query.Where(n => n.IsActive);

        // "Breaking" only counts for the first BreakingDays days; an old flagged item must not pin itself to the top.
        var breakingCutoff = DateTime.UtcNow.Date.AddDays(-BreakingDays);
        var items = await query.OrderByDescending(n => n.IsBreaking && n.PublishedDate >= breakingCutoff).ThenByDescending(n => n.PublishedDate).ToListAsync();
        return items.Select(ToListItemDto).ToList();
    }

    public async Task<NewsDto?> GetBySlugAsync(string slug)
    {
        var entity = await _db.News.AsNoTracking().Include(n => n.Category)
            .FirstOrDefaultAsync(n => n.Slug == slug && n.IsActive);
        if (entity is null) return null;

        await _db.News.Where(n => n.Id == entity.Id).ExecuteUpdateAsync(s => s.SetProperty(n => n.Views, n => n.Views + 1));
        entity.Views += 1;
        return ToFullDto(entity);
    }

    public async Task<NewsDto?> GetByIdAsync(int id)
    {
        var entity = await _db.News.AsNoTracking().Include(n => n.Category).FirstOrDefaultAsync(n => n.Id == id);
        return entity is null ? null : ToFullDto(entity);
    }

    public async Task<List<NewsCategoryOptionDto>> GetAllowedCategoriesAsync()
    {
        var all = await _db.Categories.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.DisplayOrder)
            .Select(c => new { c.Id, c.Name, c.Slug }).ToListAsync();
        return all.Where(c => NewsCategoryRules.AllowedSlugs.Contains(c.Slug))
            .Select(c => new NewsCategoryOptionDto { Id = c.Id, Name = c.Name }).ToList();
    }

    /// <summary>A news article must be filed under one of the allowed, active categories (null is not accepted).</summary>
    private async Task<ServiceResult<NewsDto>?> ValidateCategoryAsync(int? categoryId)
    {
        if (categoryId is null)
            return ServiceResult<NewsDto>.Fail("CategoryRequired", "Choose a category for this news article.");
        var allowed = await GetAllowedCategoriesAsync();
        return allowed.Any(c => c.Id == categoryId)
            ? null
            : ServiceResult<NewsDto>.Fail("InvalidCategory", $"Category must be one of: {string.Join(", ", allowed.Select(c => c.Name))}.");
    }

    public async Task<ServiceResult<NewsDto>> CreateAsync(UpsertNewsRequest request, string userId)
    {
        var categoryError = await ValidateCategoryAsync(request.CategoryId);
        if (categoryError is not null) return categoryError;

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new News
        {
            Title = request.Title,
            TitleGujarati = request.TitleGujarati,
            Slug = slug,
            FeaturedImage = request.FeaturedImage,
            Summary = request.Summary,
            Content = request.Content,
            ContentGujarati = request.ContentGujarati,
            CategoryId = request.CategoryId,
            Source = request.Source,
            SourceLink = request.SourceLink,
            PublishedDate = request.PublishedDate,
            IsBreaking = request.IsBreaking,
            IsFeatured = request.IsFeatured,
            MetaTitle = request.MetaTitle,
            MetaDescription = request.MetaDescription,
            MetaKeywords = request.MetaKeywords,
            IsActive = request.IsActive,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,
        };
        _db.News.Add(entity);
        await _db.SaveChangesAsync();
        if (entity.IsActive) await ShareAsync(entity.Id, request.SkipSocial, userId);
        var saved = await _db.News.Include(n => n.Category).FirstAsync(n => n.Id == entity.Id);
        return ServiceResult<NewsDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<NewsDto>> UpdateAsync(int id, UpsertNewsRequest request, string userId)
    {
        var entity = await _db.News.FindAsync(id);
        if (entity is null) return ServiceResult<NewsDto>.Fail("NotFound", "News article not found.");
        var categoryError = await ValidateCategoryAsync(request.CategoryId);
        if (categoryError is not null) return categoryError;

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.TitleGujarati = request.TitleGujarati;
        entity.Slug = slug;
        entity.FeaturedImage = request.FeaturedImage;
        entity.Summary = request.Summary;
        entity.Content = request.Content;
        entity.ContentGujarati = request.ContentGujarati;
        entity.CategoryId = request.CategoryId;
        entity.Source = request.Source;
        entity.SourceLink = request.SourceLink;
        entity.PublishedDate = request.PublishedDate;
        entity.IsBreaking = request.IsBreaking;
        entity.IsFeatured = request.IsFeatured;
        entity.MetaTitle = request.MetaTitle;
        entity.MetaDescription = request.MetaDescription;
        entity.MetaKeywords = request.MetaKeywords;
        var wasActive = entity.IsActive;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        if (request.IsActive && !wasActive) await ShareAsync(entity.Id, request.SkipSocial, userId);
        var saved = await _db.News.Include(n => n.Category).FirstAsync(n => n.Id == id);
        return ServiceResult<NewsDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.News.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "News article not found.");
        _db.News.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.News.AnyAsync(n => n.Slug == slug && n.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static NewsListItemDto ToListItemDto(News n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Slug = n.Slug,
        FeaturedImage = n.FeaturedImage,
        Summary = n.Summary,
        CategoryName = n.Category?.Name ?? "General",
        PublishedDate = n.PublishedDate.ToString("yyyy-MM-dd"),
        IsBreaking = IsStillBreaking(n),
        IsFeatured = n.IsFeatured,
    };

    private static NewsDto ToFullDto(News n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        TitleGujarati = n.TitleGujarati,
        Slug = n.Slug,
        FeaturedImage = n.FeaturedImage,
        Summary = n.Summary,
        Content = n.Content,
        ContentGujarati = n.ContentGujarati,
        CategoryId = n.CategoryId,
        CategoryName = n.Category?.Name ?? "General",
        Source = n.Source,
        SourceLink = n.SourceLink,
        PublishedDate = n.PublishedDate.ToString("yyyy-MM-dd"),
        Views = n.Views,
        IsBreaking = IsStillBreaking(n),
        IsFeatured = n.IsFeatured,
        MetaTitle = n.MetaTitle,
        MetaDescription = n.MetaDescription,
        MetaKeywords = n.MetaKeywords,
    };
}
