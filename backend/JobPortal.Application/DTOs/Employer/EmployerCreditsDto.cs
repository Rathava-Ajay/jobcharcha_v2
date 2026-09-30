namespace JobPortal.Application.DTOs.Employer;

public class EmployerCreditsDto
{
    public int TotalCredits { get; set; }
    public int UsedCredits { get; set; }
    public int CreditsRemaining { get; set; }
    public bool IsUnlimited { get; set; }
}

public class TopUpCreditsRequest
{
    public int EmployerPlanId { get; set; }
}

public class CreditTransactionDto
{
    public int Id { get; set; }
    public string Type { get; set; } = null!;
    public int Amount { get; set; }
    public int BalanceAfter { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; }
}
