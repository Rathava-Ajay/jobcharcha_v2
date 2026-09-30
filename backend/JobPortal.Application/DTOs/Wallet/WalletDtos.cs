using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Wallet;

public class WalletBalanceDto
{
    public decimal Balance { get; set; }
}

public class WalletTopUpOrderRequest
{
    [Range(1, 100000, ErrorMessage = "Top-up amount must be between ₹1 and ₹1,00,000.")]
    public decimal Amount { get; set; }
}

public class WalletTransactionDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string? Type { get; set; }
    public string? Description { get; set; }
    public string? ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminAdjustWalletRequest
{
    /// <summary>Positive to credit, negative to debit.</summary>
    [Range(-1000000, 1000000)]
    public decimal Amount { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(500, MinimumLength = 3)]
    public string Notes { get; set; } = null!;
}

public class AdminWalletLookupDto
{
    public string UserId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Email { get; set; }
    public decimal Balance { get; set; }
    public List<WalletTransactionDto> RecentTransactions { get; set; } = new();
}

public class WalletAuditLogItemDto
{
    public int Id { get; set; }
    public string AdminUserId { get; set; } = null!;
    public string? AdminName { get; set; }
    public string TargetUserId { get; set; } = null!;
    public string? TargetName { get; set; }
    public string? TargetEmail { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = null!;
    public string? IpAddress { get; set; }
    public decimal BalanceAfter { get; set; }
    public DateTime CreatedDate { get; set; }
}
