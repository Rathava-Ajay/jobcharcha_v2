using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("Category", Name = "IX_Products_Category")]
[Index("Category", "IsFree", Name = "IX_Products_Category_IsFree")]
[Index("IsActive", Name = "IX_Products_IsActive")]
[Index("IsActive", "IsFree", Name = "IX_Products_IsActive_IsFree")]
[Index("IsFree", Name = "IX_Products_IsFree")]
[Index("Slug", Name = "IX_Products_Slug", IsUnique = true)]
public partial class Product
{
    [Key]
    public int ProductId { get; set; }

    [StringLength(200)]
    public string Title { get; set; } = null!;

    [StringLength(200)]
    public string Slug { get; set; } = null!;

    [StringLength(500)]
    public string? ShortDescription { get; set; }

    public string? Description { get; set; }

    [StringLength(50)]
    public string Category { get; set; } = null!;

    [StringLength(50)]
    public string? SubCategory { get; set; }

    [StringLength(200)]
    public string? GoogleDriveFileId { get; set; }

    [StringLength(500)]
    public string? GoogleDriveDownloadUrl { get; set; }

    [StringLength(500)]
    public string? GoogleDriveViewUrl { get; set; }

    [StringLength(500)]
    public string? CoverImageUrl { get; set; }

    public long? FileSize { get; set; }

    public int? PageCount { get; set; }

    [StringLength(50)]
    public string? Language { get; set; }

    public bool IsFree { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Price { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? OriginalPrice { get; set; }

    public string? WhatIncluded { get; set; }

    public bool IsActive { get; set; }

    public bool IsFeatured { get; set; }

    public int TotalDownloads { get; set; }

    public int TotalSales { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal TotalRevenue { get; set; }

    [Column(TypeName = "decimal(3, 2)")]
    public decimal AverageRating { get; set; }

    public int TotalReviews { get; set; }

    [StringLength(200)]
    public string? MetaTitle { get; set; }

    [StringLength(500)]
    public string? MetaDescription { get; set; }

    [StringLength(500)]
    public string? MetaKeywords { get; set; }

    [StringLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    [StringLength(100)]
    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDate { get; set; }

    [InverseProperty("Product")]
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    [InverseProperty("Product")]
    public virtual ICollection<ProductDownload> ProductDownloads { get; set; } = new List<ProductDownload>();

    [InverseProperty("Product")]
    public virtual ICollection<ProductReview> ProductReviews { get; set; } = new List<ProductReview>();
}
