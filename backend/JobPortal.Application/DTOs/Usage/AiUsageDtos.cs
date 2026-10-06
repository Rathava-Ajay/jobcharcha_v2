namespace JobPortal.Application.DTOs.Usage;

public static class AiProviders
{
    public const string Claude = "claude";
    public const string OpenAi = "openai";
}

public static class AiOperations
{
    public const string Sync = "sync";
    public const string Image = "image";
}

/// <summary>What gets recorded for one AI call.</summary>
public class AiUsageEntry
{
    public string Provider { get; set; } = null!;
    public string Operation { get; set; } = null!;
    public string? Category { get; set; }
    public string? Model { get; set; }
    public long InputTokens { get; set; }
    public long OutputTokens { get; set; }
    public long CacheReadTokens { get; set; }
    public long CacheWriteTokens { get; set; }
    public decimal? CostUsd { get; set; }
    public int Units { get; set; } = 1;
    public int? DurationMs { get; set; }
    public int? ReferenceId { get; set; }
    public string? Note { get; set; }
}

/// <summary>Totals for one provider over some period.</summary>
public class AiProviderTotals
{
    public int Calls { get; set; }
    public int Units { get; set; }
    public long InputTokens { get; set; }
    public long OutputTokens { get; set; }
    public long CacheReadTokens { get; set; }
    public long CacheWriteTokens { get; set; }
    /// <summary>Input + output + cache read + cache write.</summary>
    public long TotalTokens => InputTokens + OutputTokens + CacheReadTokens + CacheWriteTokens;
    public decimal CostUsd { get; set; }
}

public class AiUsageDayDto
{
    /// <summary>yyyy-MM-dd in India time (IST), the same day the daily image cap uses.</summary>
    public string Date { get; set; } = null!;
    public AiProviderTotals Claude { get; set; } = new();
    public AiProviderTotals OpenAi { get; set; } = new();
}

public class AiUsageBreakdownDto
{
    public string Provider { get; set; } = null!;
    public string Operation { get; set; } = null!;
    public string? Category { get; set; }
    public AiProviderTotals Totals { get; set; } = new();
}

public class AiUsageEntryDto
{
    public int Id { get; set; }
    public DateTime OccurredAt { get; set; }
    public string Provider { get; set; } = null!;
    public string Operation { get; set; } = null!;
    public string? Category { get; set; }
    public string? Model { get; set; }
    public long InputTokens { get; set; }
    public long OutputTokens { get; set; }
    public long CacheReadTokens { get; set; }
    public long CacheWriteTokens { get; set; }
    public long TotalTokens { get; set; }
    public decimal? CostUsd { get; set; }
    public int Units { get; set; }
    public int? DurationMs { get; set; }
    public int? ReferenceId { get; set; }
    public string? Note { get; set; }
}

public class AiUsageReportDto
{
    public int Days { get; set; }
    public AiUsageDayDto Today { get; set; } = null!;
    public AiUsageDayDto Total { get; set; } = null!;
    /// <summary>One entry per day in the range, oldest first, zero-filled.</summary>
    public List<AiUsageDayDto> PerDay { get; set; } = new();
    public List<AiUsageBreakdownDto> Breakdown { get; set; } = new();
    public List<AiUsageEntryDto> Recent { get; set; } = new();
}
