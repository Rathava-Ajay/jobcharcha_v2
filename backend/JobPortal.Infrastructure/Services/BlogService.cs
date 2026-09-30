using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Blogs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class BlogService : IBlogService
{
    private readonly AppDbContext _db;

    public BlogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<BlogListItemDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.Blogs.AsNoTracking().Include(b => b.Category).AsQueryable();
        if (!includeInactive) query = query.Where(b => b.IsActive && b.IsPublished);

        var items = await query.OrderByDescending(b => b.IsFeatured).ThenByDescending(b => b.PublishedDate).ToListAsync();
        return items.Select(ToListItemDto).ToList();
    }

    public async Task<BlogDto?> GetBySlugAsync(string slug)
    {
        var entity = await _db.Blogs.AsNoTracking().Include(b => b.Category)
            .FirstOrDefaultAsync(b => b.Slug == slug && b.IsActive && b.IsPublished);
        if (entity is null) return null;

        await _db.Blogs.Where(b => b.Id == entity.Id).ExecuteUpdateAsync(s => s.SetProperty(b => b.Views, b => b.Views + 1));
        entity.Views += 1;
        return ToFullDto(entity);
    }

    public async Task<BlogDto?> GetByIdAsync(int id)
    {
        var entity = await _db.Blogs.AsNoTracking().Include(b => b.Category).FirstOrDefaultAsync(b => b.Id == id);
        return entity is null ? null : ToFullDto(entity);
    }

    public async Task<ServiceResult<BlogDto>> CreateAsync(UpsertBlogRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new Blog
        {
            Title = request.Title,
            TitleGujarati = request.TitleGujarati,
            Slug = slug,
            FeaturedImage = request.FeaturedImage,
            OfficialNotificationUrl = request.OfficialNotificationUrl,
            Excerpt = request.Excerpt,
            Content = request.Content,
            ContentGujarati = request.ContentGujarati,
            CategoryId = request.CategoryId,
            Tags = request.Tags,
            Author = request.Author,
            PublishedDate = request.PublishedDate,
            ReadTime = request.ReadTime,
            IsFeatured = request.IsFeatured,
            IsPublished = request.IsPublished,
            MetaTitle = request.MetaTitle,
            MetaDescription = request.MetaDescription,
            MetaKeywords = request.MetaKeywords,
            IsActive = request.IsActive,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,
        };
        _db.Blogs.Add(entity);
        await _db.SaveChangesAsync();
        var saved = await _db.Blogs.Include(b => b.Category).FirstAsync(b => b.Id == entity.Id);
        return ServiceResult<BlogDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<BlogDto>> UpdateAsync(int id, UpsertBlogRequest request)
    {
        var entity = await _db.Blogs.FindAsync(id);
        if (entity is null) return ServiceResult<BlogDto>.Fail("NotFound", "Blog post not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.TitleGujarati = request.TitleGujarati;
        entity.Slug = slug;
        entity.FeaturedImage = request.FeaturedImage;
        entity.OfficialNotificationUrl = request.OfficialNotificationUrl;
        entity.Excerpt = request.Excerpt;
        entity.Content = request.Content;
        entity.ContentGujarati = request.ContentGujarati;
        entity.CategoryId = request.CategoryId;
        entity.Tags = request.Tags;
        entity.Author = request.Author;
        entity.PublishedDate = request.PublishedDate;
        entity.ReadTime = request.ReadTime;
        entity.IsFeatured = request.IsFeatured;
        entity.IsPublished = request.IsPublished;
        entity.MetaTitle = request.MetaTitle;
        entity.MetaDescription = request.MetaDescription;
        entity.MetaKeywords = request.MetaKeywords;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var saved = await _db.Blogs.Include(b => b.Category).FirstAsync(b => b.Id == id);
        return ServiceResult<BlogDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.Blogs.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Blog post not found.");
        _db.Blogs.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Blogs.AnyAsync(b => b.Slug == slug && b.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static BlogListItemDto ToListItemDto(Blog b) => new()
    {
        Id = b.Id,
        Title = b.Title,
        Slug = b.Slug,
        FeaturedImage = b.FeaturedImage,
        Excerpt = b.Excerpt,
        CategoryName = b.Category?.Name ?? "General",
        Author = b.Author,
        PublishedDate = b.PublishedDate.ToString("yyyy-MM-dd"),
        ReadTime = b.ReadTime,
        IsFeatured = b.IsFeatured,
        IsPublished = b.IsPublished,
    };

    private static BlogDto ToFullDto(Blog b) => new()
    {
        Id = b.Id,
        Title = b.Title,
        TitleGujarati = b.TitleGujarati,
        Slug = b.Slug,
        FeaturedImage = b.FeaturedImage,
        OfficialNotificationUrl = b.OfficialNotificationUrl,
        Excerpt = b.Excerpt,
        Content = b.Content,
        ContentGujarati = b.ContentGujarati,
        CategoryId = b.CategoryId,
        CategoryName = b.Category?.Name ?? "General",
        Tags = b.Tags,
        Author = b.Author,
        PublishedDate = b.PublishedDate.ToString("yyyy-MM-dd"),
        Views = b.Views,
        ReadTime = b.ReadTime,
        IsFeatured = b.IsFeatured,
        IsPublished = b.IsPublished,
        MetaTitle = b.MetaTitle,
        MetaDescription = b.MetaDescription,
        MetaKeywords = b.MetaKeywords,
    };
}
