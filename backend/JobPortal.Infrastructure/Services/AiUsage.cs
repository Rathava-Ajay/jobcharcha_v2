using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Usage;

namespace JobPortal.Infrastructure.Services;

public static class IndiaTime
{
    public static readonly TimeSpan Offset = TimeSpan.FromHours(5.5);

    /// <summary>The current calendar day in India (IST). Daily usage and the daily image cap both roll over at IST midnight.</summary>
    public static DateTime Today(TimeProvider? clock = null) => (clock ?? TimeProvider.System).GetUtcNow().UtcDateTime.Add(Offset).Date;

    public static DateTime DayOf(DateTime utc) => utc.Add(Offset).Date;
}

public static class AiUsageParser
{
    /// <summary>Reads token counts, cost and model out of the Claude CLI's <c>--output-format json</c> result.
    /// Returns null when the output carries no usage figures at all.</summary>
    public static AiUsageEntry? FromClaudeCli(string cliOutput, string category, int runId)
    {
        try
        {
            using var doc = JsonDocument.Parse(cliOutput);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return null;

            static long Long(JsonElement el, string name) =>
                el.ValueKind == JsonValueKind.Object && el.TryGetProperty(name, out var p) && p.TryGetInt64(out var n) ? n : 0;

            root.TryGetProperty("usage", out var usage);
            var entry = new AiUsageEntry
            {
                Provider = AiProviders.Claude,
                Operation = AiOperations.Sync,
                Category = category,
                ReferenceId = runId,
                InputTokens = Long(usage, "input_tokens"),
                OutputTokens = Long(usage, "output_tokens"),
                CacheReadTokens = Long(usage, "cache_read_input_tokens"),
                CacheWriteTokens = Long(usage, "cache_creation_input_tokens"),
                Units = 1,
            };

            if (root.TryGetProperty("total_cost_usd", out var cost) && cost.TryGetDecimal(out var usd)) entry.CostUsd = usd;
            if (root.TryGetProperty("duration_ms", out var dur) && dur.TryGetInt32(out var ms)) entry.DurationMs = ms;

            if (root.TryGetProperty("modelUsage", out var models) && models.ValueKind == JsonValueKind.Object)
            {
                var names = models.EnumerateObject().Select(m => m.Name).ToList();
                if (names.Count > 0) entry.Model = string.Join(", ", names);
                // Some CLI versions only report the per-model breakdown.
                if (entry.InputTokens + entry.OutputTokens + entry.CacheReadTokens + entry.CacheWriteTokens == 0)
                {
                    foreach (var m in models.EnumerateObject())
                    {
                        entry.InputTokens += Long(m.Value, "inputTokens");
                        entry.OutputTokens += Long(m.Value, "outputTokens");
                        entry.CacheReadTokens += Long(m.Value, "cacheReadInputTokens");
                        entry.CacheWriteTokens += Long(m.Value, "cacheCreationInputTokens");
                    }
                }
            }

            var any = entry.InputTokens + entry.OutputTokens + entry.CacheReadTokens + entry.CacheWriteTokens > 0 || entry.CostUsd.HasValue;
            return any ? entry : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
