using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Store;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly AppDbContext _db;

    public ProductService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProductDto>> SearchAsync(string? category, string? pricing, string? search)
    {
        var query = _db.Products.AsNoTracking().Where(p => p.IsActive).AsQueryable();

        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "All", StringComparison.OrdinalIgnoreCase))
            query = query.Where(p => p.Category == category);

        if (string.Equals(pricing, "Free", StringComparison.OrdinalIgnoreCase))
            query = query.Where(p => p.IsFree || p.Price == 0);
        else if (string.Equals(pricing, "Paid", StringComparison.OrdinalIgnoreCase))
            query = query.Where(p => !p.IsFree && p.Price > 0);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(p => EF.Functions.Like(p.Title, $"%{s}%") || (p.Description != null && EF.Functions.Like(p.Description, $"%{s}%")));
        }

        var products = await query.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedDate).ToListAsync();
        return products.Select(p => ToDto(p, includeFileLinks: false)).ToList();
    }

    public async Task<ProductDto?> GetBySlugAsync(string slug)
    {
        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        return product is null ? null : ToDto(product, includeFileLinks: false);
    }

    public async Task<List<ProductDto>> GetAllForAdminAsync()
    {
        var products = await _db.Products.AsNoTracking().OrderByDescending(p => p.CreatedDate).ToListAsync();
        return products.Select(p => ToDto(p)).ToList();
    }

    public async Task<ServiceResult<ProductDto>> CreateAsync(UpsertProductRequest request)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new Product
        {
            Title = request.Title,
            Slug = slug,
            ShortDescription = request.ShortDescription,
            Description = request.Description,
            Category = request.Category,
            SubCategory = request.SubCategory,
            GoogleDriveFileId = request.GoogleDriveFileId,
            GoogleDriveDownloadUrl = request.GoogleDriveDownloadUrl,
            GoogleDriveViewUrl = request.GoogleDriveViewUrl,
            CoverImageUrl = request.CoverImageUrl,
            FileSize = request.FileSize,
            PageCount = request.PageCount,
            Language = request.Language,
            IsFree = request.IsFree,
            Price = request.IsFree ? null : request.Price,
            OriginalPrice = request.OriginalPrice,
            WhatIncluded = request.WhatIncluded,
            IsActive = request.IsActive,
            IsFeatured = request.IsFeatured,
            TotalDownloads = 0,
            TotalSales = 0,
            TotalRevenue = 0,
            AverageRating = 0,
            TotalReviews = 0,
            CreatedDate = DateTime.UtcNow,
        };
        _db.Products.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceResult<ProductDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<ProductDto>> UpdateAsync(int id, UpsertProductRequest request)
    {
        var entity = await _db.Products.FirstOrDefaultAsync(p => p.ProductId == id);
        if (entity is null) return ServiceResult<ProductDto>.Fail("NotFound", "Product not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.Slug = slug;
        entity.ShortDescription = request.ShortDescription;
        entity.Description = request.Description;
        entity.Category = request.Category;
        entity.SubCategory = request.SubCategory;
        entity.GoogleDriveFileId = request.GoogleDriveFileId;
        entity.GoogleDriveDownloadUrl = request.GoogleDriveDownloadUrl;
        entity.GoogleDriveViewUrl = request.GoogleDriveViewUrl;
        entity.CoverImageUrl = request.CoverImageUrl;
        entity.FileSize = request.FileSize;
        entity.PageCount = request.PageCount;
        entity.Language = request.Language;
        entity.IsFree = request.IsFree;
        entity.Price = request.IsFree ? null : request.Price;
        entity.OriginalPrice = request.OriginalPrice;
        entity.WhatIncluded = request.WhatIncluded;
        entity.IsActive = request.IsActive;
        entity.IsFeatured = request.IsFeatured;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceResult<ProductDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.Products.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Product not found.");

        var hasOrders = await _db.OrderItems.AnyAsync(i => i.ProductId == id);
        if (hasOrders)
        {
            // Preserve order history integrity — deactivate instead of hard-deleting a product that's been purchased.
            entity.IsActive = false;
            entity.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return ServiceResult.Ok();
        }

        _db.Products.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Products.AnyAsync(p => p.Slug == slug && p.ProductId != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    /// <summary>The Drive links are the paid file itself, so only the admin screens (which edit them) get them. Public responses must never
    /// carry them — buyers receive the download link from the authorised order-download endpoint after a verified payment.</summary>
    private static ProductDto ToDto(Product p, bool includeFileLinks = true) => new()
    {
        ProductId = p.ProductId,
        Title = p.Title,
        Slug = p.Slug,
        ShortDescription = p.ShortDescription,
        Description = p.Description,
        Category = p.Category,
        SubCategory = p.SubCategory,
        GoogleDriveDownloadUrl = includeFileLinks ? p.GoogleDriveDownloadUrl : null,
        GoogleDriveViewUrl = includeFileLinks ? p.GoogleDriveViewUrl : null,
        CoverImageUrl = p.CoverImageUrl,
        FileSize = p.FileSize,
        PageCount = p.PageCount,
        Language = p.Language,
        IsFree = p.IsFree,
        Price = p.Price,
        OriginalPrice = p.OriginalPrice,
        WhatIncluded = p.WhatIncluded,
        IsActive = p.IsActive,
        IsFeatured = p.IsFeatured,
        TotalDownloads = p.TotalDownloads,
        TotalSales = p.TotalSales,
    };
}
