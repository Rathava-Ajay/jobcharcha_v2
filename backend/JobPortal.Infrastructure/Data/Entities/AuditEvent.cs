using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>
/// Append-only activity feed of end-user actions on the site (registrations, subscriptions, contact
/// submissions, job posts, applications, purchases) surfaced on the admin "Activity Audit" screen.
/// Nothing in this codebase updates or deletes a row here — it exists purely as a chronological
/// trail. Mirrors <see cref="WalletAdjustmentAuditLog"/>'s role and column style: Actor/Target ids
/// are plain unconfigured string columns, not EF relationships, and indexes are declared via
/// attributes rather than an OnModelCreating block.
/// </summary>
[Index("CreatedDate", Name = "IX_AuditEvents_CreatedDate")]
[Index("EventType", Name = "IX_AuditEvents_EventType")]
[Index("Category", Name = "IX_AuditEvents_Category")]
[Index("ActorUserId", Name = "IX_AuditEvents_ActorUserId")]
public partial class AuditEvent
{
    [Key]
    public long Id { get; set; }

    /// <summary>Stable machine key, e.g. "employer.registered" — see AuditEventTypes.</summary>
    [StringLength(60)]
    public string EventType { get; set; } = null!;

    /// <summary>Coarse grouping for the admin filter, e.g. "Auth" / "Billing" / "Contact".</summary>
    [StringLength(30)]
    public string Category { get; set; } = null!;

    /// <summary>Human-readable one-liner shown in the audit table.</summary>
    [StringLength(300)]
    public string Summary { get; set; } = null!;

    /// <summary>The user who performed the action; null for anonymous events (e.g. contact form).</summary>
    [StringLength(450)]
    public string? ActorUserId { get; set; }

    [StringLength(200)]
    public string? ActorEmail { get; set; }

    [StringLength(40)]
    public string? ActorRole { get; set; }

    /// <summary>Entity kind the event is about, e.g. "EmployerJob", "Contact".</summary>
    [StringLength(60)]
    public string? TargetType { get; set; }

    [StringLength(450)]
    public string? TargetId { get; set; }

    /// <summary>Optional JSON blob of extra context (plan id, amount, order number, …).</summary>
    public string? MetadataJson { get; set; }

    [StringLength(64)]
    public string? IpAddress { get; set; }

    [StringLength(400)]
    public string? UserAgent { get; set; }

    public DateTime CreatedDate { get; set; }
}
