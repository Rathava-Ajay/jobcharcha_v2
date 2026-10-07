using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Store;

public class UpsertProductRequest
{
    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? Slug { get; set; }
    [StringLength(1000)] public string? ShortDescription { get; set; }
    [StringLength(20000)] public string? Description { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(100)]
    public string Category { get; set; } = null!;

    [StringLength(100)] public string? SubCategory { get; set; }
    [StringLength(300)] public string? GoogleDriveFileId { get; set; }
    [StringLength(1000)] public string? GoogleDriveDownloadUrl { get; set; }
    [StringLength(1000)] public string? GoogleDriveViewUrl { get; set; }
    [StringLength(300), RegularExpression(@"^[^/\:*?""<>|]+$", ErrorMessage = "Use a file name only, without folders.")] public string? PrivateFileName { get; set; }
    [StringLength(1000)] public string? CoverImageUrl { get; set; }
    [Range(0, long.MaxValue)] public long? FileSize { get; set; }
    [Range(0, 100000)] public int? PageCount { get; set; }
    [StringLength(50)] public string? Language { get; set; }
    public bool IsFree { get; set; }
    [Range(0, 1_000_000)] public decimal? Price { get; set; }
    [Range(0, 1_000_000)] public decimal? OriginalPrice { get; set; }
    [StringLength(10000)] public string? WhatIncluded { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
}
