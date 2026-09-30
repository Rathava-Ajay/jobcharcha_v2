using System.Net;
using System.Net.Mail;
using JobPortal.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <summary>
/// Real SMTP delivery via the built-in System.Net.Mail client — no extra NuGet dependency.
/// Falls back to a logged no-op when Smtp:Host isn't configured (placeholder appsettings),
/// so the app runs identically before and after real credentials are supplied.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _config["Smtp:SmtpHost"];
        if (string.IsNullOrWhiteSpace(host))
        {
            _logger.LogInformation("[EMAIL STUB — Smtp:SmtpHost not configured] To: {To} | Subject: {Subject}", toEmail, subject);
            return;
        }

        var port = _config.GetValue("Smtp:SmtpPort", 587);
        var user = _config["Smtp:SmtpUsername"];
        var password = _config["Smtp:SmtpPassword"];
        var fromEmail = _config["Smtp:FromEmail"] ?? user;
        var fromName = _config["Smtp:FromName"] ?? "JobCharcha";
        var enableSsl = _config.GetValue("Smtp:EnableSsl", true);

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            _logger.LogWarning("Smtp:SmtpHost is set but Smtp:FromEmail/Smtp:SmtpUsername is missing — skipping email to {To}", toEmail);
            return;
        }

        using var client = new SmtpClient(host, port) { EnableSsl = enableSsl };
        if (!string.IsNullOrWhiteSpace(user)) client.Credentials = new NetworkCredential(user, password);

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(toEmail);

        try
        {
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", toEmail);
        }
    }
}
