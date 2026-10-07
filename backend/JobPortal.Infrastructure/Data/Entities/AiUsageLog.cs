using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>One call to a paid AI provider: a Claude agent sync run, or an OpenAI image generation. Feeds the admin
/// "AI usage" tab so token consumption and (estimated) cost can be checked per day.</summary>
[Table("AiUsageLogs")]
[Index("OccurredAt", Name = "IX_AiUsageLogs_OccurredAt")]
public partial class AiUsageLog
{
    [Key]
    public int Id { get; set; }

    public DateTime OccurredAt { get; set; }

    /// <summary>"claude" or "openai".</summary>
    [StringLength(20)]
    public string Provider { get; set; } = null!;

    /// <summary>"sync" (AI Magic agent run) or "image" (share background).</summary>
    [StringLength(20)]
    public string Operation { get; set; } = null!;

    [StringLength(30)]
    public string? Category { get; set; }

    [StringLength(100)]
    public string? Model { get; set; }

    public long InputTokens { get; set; }
    public long OutputTokens { get; set; }
    public long CacheReadTokens { get; set; }
    public long CacheWriteTokens { get; set; }

    /// <summary>Claude: the cost the CLI reported (API-equivalent). OpenAI: estimated from the configured per-million rates.
    /// Null when the provider gave no usage figures.</summary>
    [Column(TypeName = "decimal(18,6)")]
    public decimal? CostUsd { get; set; }

    /// <summary>How many generated items this row covers (images for OpenAI, 1 for a sync run).</summary>
    public int Units { get; set; }

    public int? DurationMs { get; set; }

    /// <summary>Sync run id / share job id, to trace a row back to its cause.</summary>
    public int? ReferenceId { get; set; }

    [StringLength(300)]
    public string? Note { get; set; }
}
