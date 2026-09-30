using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class AlertPreference
{
    [Key]
    public int Id { get; set; }

    public string Email { get; set; } = null!;

    public string? Phone { get; set; }

    public string? WhatsAppNumber { get; set; }

    public string? Name { get; set; }

    public bool ReceiveGovtJobs { get; set; }

    public bool ReceivePrivateJobs { get; set; }

    public bool ReceiveResults { get; set; }

    public bool ReceiveAdmitCards { get; set; }

    public bool ReceiveSyllabus { get; set; }

    public bool ReceiveAnswerKeys { get; set; }

    public string? PreferredCategories { get; set; }

    public string? PreferredCities { get; set; }

    public string AlertFrequency { get; set; } = null!;

    public bool EmailEnabled { get; set; }

    public bool WhatsAppEnabled { get; set; }

    public bool SmsEnabled { get; set; }

    public bool IsEmailVerified { get; set; }

    public string? EmailVerificationToken { get; set; }

    public bool IsActive { get; set; }

    public string UnsubscribeToken { get; set; } = null!;

    public DateTime? UnsubscribedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
