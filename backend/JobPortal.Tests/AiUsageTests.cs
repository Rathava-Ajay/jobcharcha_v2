using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Usage;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPortal.Tests;

/// <summary>The AI usage tab: Claude CLI usage is parsed, OpenAI image usage is costed, and the report groups by India day.</summary>
public class AiUsageTests
{
    private const string CliOutput = """
    {"type":"result","subtype":"success","is_error":false,"duration_ms":184000,"num_turns":12,
     "result":"{\"items\":[]}","total_cost_usd":0.3321,
     "usage":{"input_tokens":52,"cache_creation_input_tokens":18040,"cache_read_input_tokens":210000,"output_tokens":4120},
     "modelUsage":{"claude-sonnet-5-5":{"inputTokens":52,"outputTokens":4120,"cacheReadInputTokens":210000,"cacheCreationInputTokens":18040,"costUSD":0.3321}}}
    """;

    [Fact]
    public void ClaudeCliOutput_IsParsedIntoTokensCostModelAndDuration()
    {
        var e = AiUsageParser.FromClaudeCli(CliOutput, "result", 77)!;

        Assert.Equal((AiProviders.Claude, AiOperations.Sync, "result", 77), (e.Provider, e.Operation, e.Category, e.ReferenceId));
        Assert.Equal((52L, 4120L, 210000L, 18040L), (e.InputTokens, e.OutputTokens, e.CacheReadTokens, e.CacheWriteTokens));
        Assert.Equal(0.3321m, e.CostUsd);
        Assert.Equal(184000, e.DurationMs);
        Assert.Equal("claude-sonnet-5-5", e.Model);
    }

    [Fact]
    public void ClaudeCliOutput_WithOnlyPerModelFigures_StillCountsTokens()
    {
        var json = """{"total_cost_usd":0.1,"modelUsage":{"a":{"inputTokens":10,"outputTokens":20},"b":{"inputTokens":5,"outputTokens":1}}}""";
        var e = AiUsageParser.FromClaudeCli(json, "news", 1)!;
        Assert.Equal((15L, 21L), (e.InputTokens, e.OutputTokens));
        Assert.Equal("a, b", e.Model);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("{}")]
    [InlineData("""{"result":"hello"}""")]
    [InlineData("[]")]
    public void OutputWithoutUsage_IsIgnored(string output) => Assert.Null(AiUsageParser.FromClaudeCli(output, "news", 1));


    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; }
        public override DateTimeOffset GetUtcNow() => Now;
    }

    [Fact]
    public async Task Report_GroupsByIndiaDay_ZeroFillsAndSplitsProviders()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var clock = new Clock { Now = new DateTimeOffset(2026, 10, 3, 20, 0, 0, TimeSpan.Zero) };      // 4 Oct 01:30 IST
        var service = new AiUsageService(db, new SocialShareOptions(), NullLogger<AiUsageService>.Instance, clock);

        // 3 Oct 18:40 UTC is already 4 Oct 00:10 in India, so it belongs to "today" (4 Oct), not 3 Oct.
        clock.Now = new DateTimeOffset(2026, 10, 3, 18, 40, 0, TimeSpan.Zero);
        await service.RecordAsync(new AiUsageEntry { Provider = AiProviders.Claude, Operation = AiOperations.Sync, Category = "job", InputTokens = 100, OutputTokens = 200, CacheReadTokens = 1000, CacheWriteTokens = 50, CostUsd = 0.25m });
        clock.Now = new DateTimeOffset(2026, 10, 3, 5, 0, 0, TimeSpan.Zero);                         // 3 Oct 10:30 IST
        await service.RecordAsync(new AiUsageEntry { Provider = AiProviders.OpenAi, Operation = AiOperations.Image, Category = "news", InputTokens = 150, OutputTokens = 1056, CostUsd = 0.04251m });
        clock.Now = new DateTimeOffset(2026, 10, 3, 20, 0, 0, TimeSpan.Zero);
        await service.RecordAsync(new AiUsageEntry { Provider = AiProviders.OpenAi, Operation = AiOperations.Image, Category = "job", InputTokens = 150, OutputTokens = 1056, CostUsd = 0.04251m });
        clock.Now = new DateTimeOffset(2026, 9, 1, 0, 0, 0, TimeSpan.Zero);                          // outside the window
        await service.RecordAsync(new AiUsageEntry { Provider = AiProviders.Claude, Operation = AiOperations.Sync, Category = "job", InputTokens = 999999 });
        clock.Now = new DateTimeOffset(2026, 10, 3, 20, 0, 0, TimeSpan.Zero);

        var report = await service.GetReportAsync(3);

        Assert.Equal(new[] { "2026-10-02", "2026-10-03", "2026-10-04" }, report.PerDay.Select(d => d.Date));
        Assert.Equal(0, report.PerDay[0].Claude.Calls + report.PerDay[0].OpenAi.Calls);               // zero-filled day

        var today = report.Today;
        Assert.Equal("2026-10-04", today.Date);
        Assert.Equal((1, 1350L, 0.25m), (today.Claude.Calls, today.Claude.TotalTokens, today.Claude.CostUsd));
        Assert.Equal((1, 1206L), (today.OpenAi.Units, today.OpenAi.TotalTokens));

        Assert.Equal((1, 1206L), (report.PerDay[1].OpenAi.Units, report.PerDay[1].OpenAi.TotalTokens));
        Assert.Equal(2, report.Total.OpenAi.Units);
        Assert.Equal(1, report.Total.Claude.Calls);                                                    // September row excluded
        Assert.Equal(0.25m + 0.04251m * 2, report.Total.Claude.CostUsd + report.Total.OpenAi.CostUsd);

        Assert.Contains(report.Breakdown, b => b is { Provider: "claude", Operation: "sync", Category: "job" } && b.Totals.Calls == 1);
        Assert.Equal(3, report.Recent.Count);
    }

    [Fact]
    public async Task Recording_NeverThrows_EvenWhenTheDatabaseIsGone()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = new AiUsageService(db, new SocialShareOptions(), NullLogger<AiUsageService>.Instance);
        await db.DisposeAsync();

        await service.RecordAsync(new AiUsageEntry { Provider = AiProviders.Claude, Operation = AiOperations.Sync });   // must not throw
    }
}
