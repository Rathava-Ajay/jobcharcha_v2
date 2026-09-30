namespace JobPortal.Application.DTOs.Employer;

public class EmployerSubscriptionDto
{
    public int? Id { get; set; }
    public string? PlanName { get; set; }
    public string Status { get; set; } = "none";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? DaysRemaining { get; set; }
    public bool AutoRenew { get; set; }
    public int MaxActiveJobs { get; set; }
    public int MaxFeaturedJobs { get; set; }
    public bool CanAccessResumes { get; set; }
}

public class RenewSubscriptionRequest
{
    public int EmployerPlanId { get; set; }
}
