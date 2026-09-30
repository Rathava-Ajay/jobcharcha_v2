using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CreatedDate", Name = "IX_ProductReviews_CreatedDate")]
[Index("IsPublished", Name = "IX_ProductReviews_IsPublished")]
[Index("OrderId", Name = "IX_ProductReviews_OrderId")]
[Index("OrderId1", Name = "IX_ProductReviews_OrderId1")]
[Index("ProductId", Name = "IX_ProductReviews_ProductId")]
public partial class ProductReview
{
    [Key]
    public int ReviewId { get; set; }

    public int ProductId { get; set; }

    public int OrderId { get; set; }

    [StringLength(200)]
    public string CustomerName { get; set; } = null!;

    [StringLength(200)]
    public string CustomerEmail { get; set; } = null!;

    public int Rating { get; set; }

    [StringLength(200)]
    public string? ReviewTitle { get; set; }

    [StringLength(2000)]
    public string? ReviewText { get; set; }

    public bool IsVerifiedPurchase { get; set; }

    public bool IsApproved { get; set; }

    public bool IsPublished { get; set; }

    public int HelpfulCount { get; set; }

    public int NotHelpfulCount { get; set; }

    [StringLength(1000)]
    public string? AdminResponse { get; set; }

    public DateTime? AdminResponseDate { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? ApprovedDate { get; set; }

    [StringLength(100)]
    public string? ApprovedBy { get; set; }

    public int? OrderId1 { get; set; }

    public int? PurchaseOrderId { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("ProductReviewOrders")]
    public virtual Order Order { get; set; } = null!;

    [ForeignKey("OrderId1")]
    [InverseProperty("ProductReviewOrderId1Navigations")]
    public virtual Order? OrderId1Navigation { get; set; }

    [ForeignKey("ProductId")]
    [InverseProperty("ProductReviews")]
    public virtual Product Product { get; set; } = null!;
}
