namespace JobPortal.Application.DTOs.Employer;

public class EmployerCreateOrderResponse
{
    public int PaymentId { get; set; }
    public string RazorpayOrderId { get; set; } = null!;
    public long Amount { get; set; }
    public string Currency { get; set; } = null!;
    public string KeyId { get; set; } = null!;
}

public class EmployerVerifyPaymentRequest
{
    public string RazorpayOrderId { get; set; } = null!;
    public string RazorpayPaymentId { get; set; } = null!;
    public string RazorpaySignature { get; set; } = null!;
}

public class EmployerVerifyPaymentResponse
{
    public bool Paid { get; set; }
    public bool IsTopUp { get; set; }
    public string PlanName { get; set; } = null!;
    public int CreditsGranted { get; set; }
}
