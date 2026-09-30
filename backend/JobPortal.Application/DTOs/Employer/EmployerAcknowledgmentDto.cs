using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Employer;

public class AcknowledgeTermsRequest
{
    [Required(AllowEmptyStrings = false), StringLength(50)]
    public string PlanVersion { get; set; } = null!;
}

public class AcknowledgmentStatusDto
{
    public bool HasAcknowledgedLatest { get; set; }
    public string? PlanVersion { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public string CurrentPlanVersion { get; set; } = null!;
}
