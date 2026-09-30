namespace JobPortal.Application.DTOs.Employer;

public class ContactCandidateRequest
{
    public string? InitialMessage { get; set; }
}

public class ContactCandidateResponse
{
    public bool Allowed { get; set; }
    /// <summary>already_unlocked | success | blocked_expired | blocked_no_credits | blocked_both.</summary>
    public string Reason { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public int CreditsRemaining { get; set; }
    public bool IsUnlimited { get; set; }
}

public class ContactHistoryItemDto
{
    public int Id { get; set; }
    public string CandidateUserId { get; set; } = null!;
    public string CandidateName { get; set; } = null!;
    public string Status { get; set; } = null!;
    public bool CreditDeducted { get; set; }
    public string? InitialMessage { get; set; }
    public DateTime CreatedDate { get; set; }
}
