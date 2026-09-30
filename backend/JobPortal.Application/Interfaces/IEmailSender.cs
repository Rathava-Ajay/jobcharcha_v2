namespace JobPortal.Application.Interfaces;

/// <summary>
/// Abstraction over transactional email delivery. Phase 1 implementation is a
/// no-op that logs instead of sending; swap for a real SMTP sender once
/// SystemSettings has valid credentials.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
}
