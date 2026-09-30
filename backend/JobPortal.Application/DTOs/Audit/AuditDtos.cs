namespace JobPortal.Application.DTOs.Audit;

/// <summary>What a service passes to <c>IAuditService.LogAsync</c>. Only EventType/Category/Summary
/// are required; actor identity and request metadata (IP/UA) are filled from the current
/// HttpContext when not supplied.</summary>
public sealed class AuditEntry
{
    public required string EventType { get; init; }
    public required string Category { get; init; }
    public required string Summary { get; init; }

    public string? ActorUserId { get; init; }
    public string? ActorEmail { get; init; }
    public string? ActorRole { get; init; }

    public string? TargetType { get; init; }
    public string? TargetId { get; init; }

    /// <summary>Serialized to JSON and stored in <c>AuditEvent.MetadataJson</c>.</summary>
    public object? Metadata { get; init; }
}

public class AuditQuery
{
    public string? Category { get; set; }
    public string? EventType { get; set; }
    public string? Search { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

/// <summary>One signup-source bucket for the campaign attribution report (null source ⇒ "organic").</summary>
public class SignupSourceStatDto
{
    public string Source { get; set; } = null!;
    public int Aspirants { get; set; }
    public int Employers { get; set; }
    public int Other { get; set; }
    public int Total { get; set; }
}

public class AuditEventDto
{
    public long Id { get; set; }
    public string EventType { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string Summary { get; set; } = null!;
    public string? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? ActorEmail { get; set; }
    public string? ActorRole { get; set; }
    public string? TargetType { get; set; }
    public string? TargetId { get; set; }
    public string? MetadataJson { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedDate { get; set; }
}
