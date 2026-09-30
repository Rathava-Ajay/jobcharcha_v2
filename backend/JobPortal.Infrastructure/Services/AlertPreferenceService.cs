using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Alerts;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class AlertPreferenceService : IAlertPreferenceService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public AlertPreferenceService(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<ServiceResult<AlertPreferenceDto>> SubscribeAsync(SubscribeAlertRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var entity = await _db.AlertPreferences.FirstOrDefaultAsync(a => a.Email.ToLower() == normalizedEmail);
        var now = DateTime.UtcNow;
        var isNew = entity is null;

        if (entity is null)
        {
            entity = new AlertPreference
            {
                Email = request.Email.Trim(),
                UnsubscribeToken = Guid.NewGuid().ToString("N"),
                CreatedAt = now,
                ReceiveGovtJobs = true,
                ReceivePrivateJobs = true,
                ReceiveResults = true,
                ReceiveAdmitCards = true,
                ReceiveSyllabus = true,
                ReceiveAnswerKeys = true,
            };
            _db.AlertPreferences.Add(entity);
        }

        var categoriesCsv = string.Join(",", request.PreferredCategories
            .Select(c => c.Trim())
            .Where(c => c.Length > 0)
            .Distinct());

        entity.Phone = request.Phone;
        entity.WhatsAppNumber = request.WhatsAppNumber;
        entity.Name = request.Name;
        entity.PreferredCategories = categoriesCsv.Length > 0 ? categoriesCsv : null;
        entity.PreferredCities = string.IsNullOrWhiteSpace(request.PreferredRegion) ? null : request.PreferredRegion.Trim();
        // No digest scheduler or WhatsApp send integration exists yet (dispatch is always
        // realtime, email-only) — force these to match reality regardless of what a client
        // sends, so the stored preference never promises delivery the system can't perform.
        entity.AlertFrequency = "instant";
        entity.EmailEnabled = request.EmailEnabled;
        entity.WhatsAppEnabled = false;
        entity.IsActive = true;
        entity.UnsubscribedAt = null;
        entity.UpdatedAt = now;

        await _db.SaveChangesAsync();

        if (isNew)
        {
            await _audit.LogAsync(new AuditEntry
            {
                EventType = AuditEventTypes.JobAlertSubscribed,
                Category = AuditEventTypes.Categories.Alerts,
                Summary = $"Job-alert subscription: {entity.Email}",
                ActorEmail = entity.Email,
                TargetType = "AlertPreference",
                TargetId = entity.Id.ToString(),
                Metadata = new { categories = entity.PreferredCategories, region = entity.PreferredCities },
            });
        }

        return ServiceResult<AlertPreferenceDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult> UnsubscribeAsync(string token)
    {
        var entity = await _db.AlertPreferences.FirstOrDefaultAsync(a => a.UnsubscribeToken == token);
        if (entity is null) return ServiceResult.Fail("NotFound", "Invalid or expired unsubscribe link.");

        entity.IsActive = false;
        entity.UnsubscribedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<List<AlertPreferenceAdminListItemDto>> GetAllForAdminAsync()
    {
        var items = await _db.AlertPreferences.AsNoTracking().OrderByDescending(a => a.CreatedAt).ToListAsync();
        return items.Select(ToAdminListItemDto).ToList();
    }

    public async Task<ServiceResult> SetActiveAsync(int id, bool isActive)
    {
        var entity = await _db.AlertPreferences.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Alert subscriber not found.");

        entity.IsActive = isActive;
        entity.UnsubscribedAt = isActive ? null : DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static AlertPreferenceAdminListItemDto ToAdminListItemDto(AlertPreference a) => new()
    {
        Id = a.Id,
        Email = a.Email,
        Phone = a.Phone,
        WhatsAppNumber = a.WhatsAppNumber,
        Name = a.Name,
        PreferredCategories = string.IsNullOrWhiteSpace(a.PreferredCategories)
            ? new List<string>()
            : a.PreferredCategories.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
        PreferredRegion = a.PreferredCities,
        AlertFrequency = a.AlertFrequency,
        EmailEnabled = a.EmailEnabled,
        WhatsAppEnabled = a.WhatsAppEnabled,
        SmsEnabled = a.SmsEnabled,
        IsEmailVerified = a.IsEmailVerified,
        IsActive = a.IsActive,
        CreatedAt = a.CreatedAt.ToString("yyyy-MM-dd"),
        UnsubscribedAt = a.UnsubscribedAt?.ToString("yyyy-MM-dd"),
    };

    private static AlertPreferenceDto ToDto(AlertPreference a) => new()
    {
        Id = a.Id,
        Email = a.Email,
        PreferredCategories = string.IsNullOrWhiteSpace(a.PreferredCategories)
            ? new List<string>()
            : a.PreferredCategories.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
        PreferredRegion = a.PreferredCities,
        AlertFrequency = a.AlertFrequency,
        EmailEnabled = a.EmailEnabled,
        WhatsAppEnabled = a.WhatsAppEnabled,
        IsActive = a.IsActive,
    };
}
