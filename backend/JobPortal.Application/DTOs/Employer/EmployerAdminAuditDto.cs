using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Employer;

public class AdminContactLogQuery
{
    public int? EmployerProfileId { get; set; }
    public string? Status { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class AdminContactLogItemDto
{
    public int Id { get; set; }
    public int EmployerProfileId { get; set; }
    public string CompanyName { get; set; } = null!;
    public string CandidateUserId { get; set; } = null!;
    public string CandidateName { get; set; } = null!;
    public string Status { get; set; } = null!;
    public bool CreditDeducted { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class AdminEmployerOverviewDto
{
    public int EmployerProfileId { get; set; }
    public string CompanyName { get; set; } = null!;
    public EmployerSubscriptionDto Subscription { get; set; } = null!;
    public EmployerCreditsDto Credits { get; set; } = null!;
    public List<AdminContactLogItemDto> RecentContactLogs { get; set; } = new();
}

public class ManualCreditAdjustmentRequest
{
    public int EmployerProfileId { get; set; } // set from the route by the controller

    [Range(-100000, 100000)]
    public int Amount { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(500, MinimumLength = 3)]
    public string Reason { get; set; } = null!;
}

public class FraudFlagDto
{
    public int EmployerProfileId { get; set; }
    public string CompanyName { get; set; } = null!;
    public int ContactsToday { get; set; }
    public int Threshold { get; set; }
}
