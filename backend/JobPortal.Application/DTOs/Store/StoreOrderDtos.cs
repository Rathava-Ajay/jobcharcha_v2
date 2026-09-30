using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Store;

public class CartItemRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "productId is invalid.")]
    public int ProductId { get; set; }

    [Range(1, 99, ErrorMessage = "Quantity must be between 1 and 99.")]
    public int Quantity { get; set; } = 1;
}

public class CheckoutRequest
{
    [Required, MinLength(1, ErrorMessage = "Your cart is empty.")]
    [MaxLength(50, ErrorMessage = "Too many items in one order.")]
    public List<CartItemRequest> Items { get; set; } = new();

    /// <summary>"razorpay" or "wallet".</summary>
    [Required]
    [RegularExpression("^(?i:razorpay|wallet)$", ErrorMessage = "paymentMethod must be 'razorpay' or 'wallet'.")]
    public string PaymentMethod { get; set; } = null!;

    [StringLength(40)]
    public string? CouponCode { get; set; }
}

public class CheckoutResponse
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = null!;
    public decimal FinalAmount { get; set; }

    /// <summary>Present only when PaymentMethod was "razorpay" — null for a wallet order, which is already Paid by the time this returns.</summary>
    public string? RazorpayOrderId { get; set; }
    public long? RazorpayAmount { get; set; }
    public string? KeyId { get; set; }

    /// <summary>True when PaymentMethod was "wallet" and the debit succeeded synchronously — no further client action needed.</summary>
    public bool AlreadyPaid { get; set; }
}

public class VerifyStoreOrderRequest
{
    [Required, StringLength(80)]
    public string RazorpayOrderId { get; set; } = null!;

    [Required, StringLength(80)]
    public string RazorpayPaymentId { get; set; } = null!;

    [Required, StringLength(256)]
    public string RazorpaySignature { get; set; } = null!;
}

public class VerifyStoreOrderResponse
{
    public bool Unlocked { get; set; }
    public int OrderId { get; set; }
}

public class StoreOrderItemDto
{
    public int OrderItemId { get; set; }
    public int ProductId { get; set; }
    public string ProductTitle { get; set; } = null!;
    public string? ProductSlug { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public bool CanDownload { get; set; }
    public int DownloadCount { get; set; }
    public int MaxDownloadCount { get; set; }
}

public class StoreOrderDto
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = null!;
    public decimal FinalAmount { get; set; }
    public string PaymentStatus { get; set; } = null!;
    public string? PaymentMethod { get; set; }
    public DateTime OrderDate { get; set; }
    public List<StoreOrderItemDto> Items { get; set; } = new();
}

public class RefundStoreOrderRequest
{
    [StringLength(500)]
    public string? Reason { get; set; }
}

public class RefundStoreOrderResponse
{
    public int OrderId { get; set; }
    public string RazorpayRefundId { get; set; } = null!;
    public string Status { get; set; } = null!;
}
