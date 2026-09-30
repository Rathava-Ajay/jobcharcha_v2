using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("OrderId", Name = "IX_OrderItems_OrderId")]
[Index("ProductId", Name = "IX_OrderItems_ProductId")]
public partial class OrderItem
{
    [Key]
    public int OrderItemId { get; set; }

    public int OrderId { get; set; }

    public int ProductId { get; set; }

    [StringLength(200)]
    public string ProductTitle { get; set; } = null!;

    [StringLength(200)]
    public string? ProductSlug { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    public int Quantity { get; set; } = 1;

    [StringLength(100)]
    public string? DownloadToken { get; set; }

    public int DownloadCount { get; set; }

    public int MaxDownloadCount { get; set; }

    public DateTime? FirstDownloadDate { get; set; }

    public DateTime? LastDownloadDate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedDate { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("OrderItems")]
    public virtual Order Order { get; set; } = null!;

    [ForeignKey("ProductId")]
    [InverseProperty("OrderItems")]
    public virtual Product Product { get; set; } = null!;

    [InverseProperty("OrderItem")]
    public virtual ICollection<ProductDownload> ProductDownloads { get; set; } = new List<ProductDownload>();
}
