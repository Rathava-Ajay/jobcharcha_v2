namespace JobPortal.Application.DTOs.Settings;

public class SiteSettingsDto
{
    public string SiteName { get; set; } = null!;
    public string? LogoUrl { get; set; }
    public string? Description { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoKeywords { get; set; }
    public string? SmtpHost { get; set; }
    public int? SmtpPort { get; set; }
    public string? SmtpUser { get; set; }
    public string? RazorpayKeyId { get; set; }
    public string? TelegramBotToken { get; set; }
    public string? FacebookAppId { get; set; }
    public string? WhatsAppChannelUrl { get; set; }
    public string? TelegramChannelUrl { get; set; }
}
