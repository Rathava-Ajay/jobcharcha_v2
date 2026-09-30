using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CustomerEmail", Name = "IX_Orders_CustomerEmail")]
[Index("OrderDate", Name = "IX_Orders_OrderDate")]
[Index("OrderNumber", Name = "IX_Orders_OrderNumber", IsUnique = true)]
[Index("PaymentStatus", Name = "IX_Orders_PaymentStatus")]
public partial class Order
{
    [Key]
    public int OrderId { get; set; }

    [StringLength(50)]
    public string OrderNumber { get; set; } = null!;

    public string? UserId { get; set; }

    [StringLength(200)]
    public string CustomerName { get; set; } = null!;

    [StringLength(200)]
    public string CustomerEmail { get; set; } = null!;

    [StringLength(20)]
    public string CustomerPhone { get; set; } = null!;

    [Column(TypeName = "decimal(10, 2)")]
    public decimal TotalAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal DiscountAmount { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal FinalAmount { get; set; }

    [StringLength(3)]
    public string Currency { get; set; } = null!;

    [StringLength(50)]
    public string PaymentStatus { get; set; } = null!;

    [StringLength(50)]
    public string? PaymentMethod { get; set; }

    [StringLength(100)]
    public string? RazorpayOrderId { get; set; }

    [StringLength(100)]
    public string? RazorpayPaymentId { get; set; }

    [StringLength(200)]
    public string? RazorpaySignature { get; set; }

    public string? PaymentDetails { get; set; }

    public DateTime OrderDate { get; set; }

    public DateTime? PaymentDate { get; set; }

    [Column("IPAddress")]
    [StringLength(50)]
    public string? Ipaddress { get; set; }

    [StringLength(1000)]
    public string? UserAgent { get; set; }

    [StringLength(1000)]
    public string? CustomerNotes { get; set; }

    [StringLength(1000)]
    public string? AdminNotes { get; set; }

    public bool IsEmailSent { get; set; }

    public DateTime? EmailSentDate { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    [InverseProperty("Order")]
    public virtual ICollection<EmailLog> EmailLogs { get; set; } = new List<EmailLog>();

    [InverseProperty("Order")]
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    [InverseProperty("Order")]
    public virtual ICollection<PaymentLog> PaymentLogs { get; set; } = new List<PaymentLog>();

    [InverseProperty("OrderId1Navigation")]
    public virtual ICollection<ProductDownload> ProductDownloadOrderId1Navigations { get; set; } = new List<ProductDownload>();

    [InverseProperty("Order")]
    public virtual ICollection<ProductDownload> ProductDownloadOrders { get; set; } = new List<ProductDownload>();

    [InverseProperty("OrderId1Navigation")]
    public virtual ICollection<ProductReview> ProductReviewOrderId1Navigations { get; set; } = new List<ProductReview>();

    [InverseProperty("Order")]
    public virtual ICollection<ProductReview> ProductReviewOrders { get; set; } = new List<ProductReview>();

    [ForeignKey("UserId")]
    [InverseProperty("Orders")]
    public virtual AspNetUser? User { get; set; }
}
