using System.ComponentModel.DataAnnotations;
using JobPortal.Application.Common;

namespace JobPortal.Application.DTOs.Alerts;

public class SubscribeAlertRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    public string? Phone { get; set; }
    public string? WhatsAppNumber { get; set; }

    [StringLength(100, MinimumLength = 2)]
    [RegularExpression(ValidationPatterns.PersonNamePattern, ErrorMessage = ValidationPatterns.PersonNameErrorMessage)]
    public string? Name { get; set; }
    public List<string> PreferredCategories { get; set; } = new();
    public string? PreferredRegion { get; set; }

    [Required]
    public string AlertFrequency { get; set; } = "daily"; // instant | daily | weekly

    public bool EmailEnabled { get; set; } = true;
    public bool WhatsAppEnabled { get; set; }
}

public class AlertPreferenceDto
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public List<string> PreferredCategories { get; set; } = new();
    public string? PreferredRegion { get; set; }
    public string AlertFrequency { get; set; } = null!;
    public bool EmailEnabled { get; set; }
    public bool WhatsAppEnabled { get; set; }
    public bool IsActive { get; set; }
}

public class AlertPreferenceAdminListItemDto
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string? Name { get; set; }
    public List<string> PreferredCategories { get; set; } = new();
    public string? PreferredRegion { get; set; }
    public string AlertFrequency { get; set; } = null!;
    public bool EmailEnabled { get; set; }
    public bool WhatsAppEnabled { get; set; }
    public bool SmsEnabled { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; }
    public string CreatedAt { get; set; } = null!;
    public string? UnsubscribedAt { get; set; }
}

public class SetAlertPreferenceActiveRequest
{
    public bool IsActive { get; set; }
}
