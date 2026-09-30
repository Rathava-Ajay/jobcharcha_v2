using JobPortal.Application.DTOs.Settings;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;

    public SettingsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<SiteSettingsDto> GetAsync()
    {
        var row = await GetOrCreateRowAsync();
        return ToDto(row);
    }

    public async Task<SiteSettingsDto> UpdateAsync(SiteSettingsDto dto)
    {
        var row = await GetOrCreateRowAsync();
        row.SiteName = dto.SiteName;
        row.LogoUrl = dto.LogoUrl;
        row.Description = dto.Description;
        row.SeoTitle = dto.SeoTitle;
        row.SeoKeywords = dto.SeoKeywords;
        row.SmtpHost = dto.SmtpHost;
        row.SmtpPort = dto.SmtpPort;
        row.SmtpUser = dto.SmtpUser;
        row.RazorpayKeyId = dto.RazorpayKeyId;
        row.TelegramBotToken = dto.TelegramBotToken;
        row.FacebookAppId = dto.FacebookAppId;
        row.WhatsAppChannelUrl = dto.WhatsAppChannelUrl;
        row.TelegramChannelUrl = dto.TelegramChannelUrl;
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToDto(row);
    }

    private async Task<SiteSetting> GetOrCreateRowAsync()
    {
        var row = await _db.SiteSettings.FirstOrDefaultAsync();
        if (row is not null) return row;

        row = new SiteSetting { SiteName = "JobCharcha", CreatedDate = DateTime.UtcNow };
        _db.SiteSettings.Add(row);
        await _db.SaveChangesAsync();
        return row;
    }

    private static SiteSettingsDto ToDto(SiteSetting s) => new()
    {
        SiteName = s.SiteName,
        LogoUrl = s.LogoUrl,
        Description = s.Description,
        SeoTitle = s.SeoTitle,
        SeoKeywords = s.SeoKeywords,
        SmtpHost = s.SmtpHost,
        SmtpPort = s.SmtpPort,
        SmtpUser = s.SmtpUser,
        RazorpayKeyId = s.RazorpayKeyId,
        TelegramBotToken = s.TelegramBotToken,
        FacebookAppId = s.FacebookAppId,
        WhatsAppChannelUrl = s.WhatsAppChannelUrl,
        TelegramChannelUrl = s.TelegramChannelUrl,
    };
}
