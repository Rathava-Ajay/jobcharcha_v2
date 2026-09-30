using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("DownloadDate", Name = "IX_ProductDownloads_DownloadDate")]
[Index("DownloadType", Name = "IX_ProductDownloads_DownloadType")]
[Index("Email", Name = "IX_ProductDownloads_Email")]
[Index("OrderId", Name = "IX_ProductDownloads_OrderId")]
[Index("OrderId1", Name = "IX_ProductDownloads_OrderId1")]
[Index("OrderItemId", Name = "IX_ProductDownloads_OrderItemId")]
[Index("ProductId", Name = "IX_ProductDownloads_ProductId")]
public partial class ProductDownload
{
    [Key]
    public int DownloadId { get; set; }

    public int ProductId { get; set; }

    [StringLength(200)]
    public string? Email { get; set; }

    [StringLength(50)]
    public string? IpAddress { get; set; }

    [StringLength(500)]
    public string? UserAgent { get; set; }

    [StringLength(20)]
    public string DownloadType { get; set; } = null!;

    public int? OrderId { get; set; }

    public DateTime DownloadDate { get; set; }

    public bool IsSuccessful { get; set; }

    [StringLength(500)]
    public string? ErrorMessage { get; set; }

    public int? OrderId1 { get; set; }

    public int? OrderItemId { get; set; }

    public int PurchaseOrderId { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("ProductDownloadOrders")]
    public virtual Order? Order { get; set; }

    [ForeignKey("OrderId1")]
    [InverseProperty("ProductDownloadOrderId1Navigations")]
    public virtual Order? OrderId1Navigation { get; set; }

    [ForeignKey("OrderItemId")]
    [InverseProperty("ProductDownloads")]
    public virtual OrderItem? OrderItem { get; set; }

    [ForeignKey("ProductId")]
    [InverseProperty("ProductDownloads")]
    public virtual Product Product { get; set; } = null!;
}
