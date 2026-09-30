namespace JobPortal.Application.DTOs.Store;

public class ProductDto
{
    public int ProductId { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string Category { get; set; } = null!;
    public string? SubCategory { get; set; }
    public string? GoogleDriveDownloadUrl { get; set; }
    public string? GoogleDriveViewUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public long? FileSize { get; set; }
    public int? PageCount { get; set; }
    public string? Language { get; set; }
    public bool IsFree { get; set; }
    public decimal? Price { get; set; }
    public decimal? OriginalPrice { get; set; }
    public string? WhatIncluded { get; set; }
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }
    public int TotalDownloads { get; set; }
    public int TotalSales { get; set; }
}
