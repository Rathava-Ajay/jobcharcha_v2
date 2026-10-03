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

    public async Task<List<NewsListItemDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.News.AsNoTracking().Include(n => n.Category).AsQueryable();
        if (!includeInactive) query = query.Where(n => n.IsActive);

        var items = await query.OrderByDescending(n => n.IsBreaking).ThenByDescending(n => n.PublishedDate).ToListAsync();
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

    public async Task<ServiceResult<NewsDto>> CreateAsync(UpsertNewsRequest request, string userId)
    {
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
        IsBreaking = n.IsBreaking,
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
        IsBreaking = n.IsBreaking,
        IsFeatured = n.IsFeatured,
        MetaTitle = n.MetaTitle,
        MetaDescription = n.MetaDescription,
        MetaKeywords = n.MetaKeywords,
    };
}
