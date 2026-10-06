using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Usage;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

public class AiUsageService : IAiUsageService
{
    private readonly AppDbContext _db;
    private readonly SocialShareOptions _options;
    private readonly ILogger<AiUsageService> _logger;
    private readonly TimeProvider _clock;

    public AiUsageService(AppDbContext db, SocialShareOptions options, ILogger<AiUsageService> logger, TimeProvider? clock = null)
    {
        _db = db;
        _options = options;
        _logger = logger;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task RecordAsync(AiUsageEntry e)
    {
        try
        {
            _db.AiUsageLogs.Add(new AiUsageLog
            {
                OccurredAt = _clock.GetUtcNow().UtcDateTime,
                Provider = e.Provider, Operation = e.Operation, Category = e.Category, Model = e.Model,
                InputTokens = e.InputTokens, OutputTokens = e.OutputTokens,
                CacheReadTokens = e.CacheReadTokens, CacheWriteTokens = e.CacheWriteTokens,
                CostUsd = e.CostUsd, Units = e.Units, DurationMs = e.DurationMs, ReferenceId = e.ReferenceId,
                Note = e.Note is { Length: > 300 } n ? n[..300] : e.Note,
            });
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not record AI usage for {Provider}/{Operation}.", e.Provider, e.Operation);
        }
    }

    public async Task<AiUsageReportDto> GetReportAsync(int days = 7)
    {
        days = Math.Clamp(days, 1, 90);
        var today = IndiaTime.Today(_clock);
        var firstDay = today.AddDays(-(days - 1));
        var sinceUtc = firstDay - IndiaTime.Offset;     // IST midnight of the first day, as UTC

        var rows = await _db.AiUsageLogs.AsNoTracking().Where(l => l.OccurredAt >= sinceUtc).OrderBy(l => l.OccurredAt).ToListAsync();

        static void Add(AiProviderTotals t, AiUsageLog l)
        {
            t.Calls++;
            t.Units += l.Units;
            t.InputTokens += l.InputTokens;
            t.OutputTokens += l.OutputTokens;
            t.CacheReadTokens += l.CacheReadTokens;
            t.CacheWriteTokens += l.CacheWriteTokens;
            t.CostUsd += l.CostUsd ?? 0;
        }
        static AiProviderTotals Pick(AiUsageDayDto d, string provider) => provider == AiProviders.Claude ? d.Claude : d.OpenAi;

        var perDay = Enumerable.Range(0, days).Select(i => new AiUsageDayDto { Date = firstDay.AddDays(i).ToString("yyyy-MM-dd") }).ToList();
        var byDate = perDay.ToDictionary(d => d.Date);
        var total = new AiUsageDayDto { Date = "total" };

        foreach (var l in rows)
        {
            if (l.Provider is not (AiProviders.Claude or AiProviders.OpenAi)) continue;
            var key = IndiaTime.DayOf(l.OccurredAt).ToString("yyyy-MM-dd");
            if (byDate.TryGetValue(key, out var day)) Add(Pick(day, l.Provider), l);
            Add(Pick(total, l.Provider), l);
        }

        var breakdown = rows
            .GroupBy(l => new { l.Provider, l.Operation, l.Category })
            .Select(g =>
            {
                var b = new AiUsageBreakdownDto { Provider = g.Key.Provider, Operation = g.Key.Operation, Category = g.Key.Category };
                foreach (var l in g) Add(b.Totals, l);
                return b;
            })
            .OrderByDescending(b => b.Totals.CostUsd).ThenByDescending(b => b.Totals.TotalTokens)
            .ToList();

        var recent = rows.OrderByDescending(l => l.OccurredAt).Take(30).Select(l => new AiUsageEntryDto
        {
            Id = l.Id, OccurredAt = l.OccurredAt, Provider = l.Provider, Operation = l.Operation, Category = l.Category, Model = l.Model,
            InputTokens = l.InputTokens, OutputTokens = l.OutputTokens, CacheReadTokens = l.CacheReadTokens, CacheWriteTokens = l.CacheWriteTokens,
            TotalTokens = l.InputTokens + l.OutputTokens + l.CacheReadTokens + l.CacheWriteTokens,
            CostUsd = l.CostUsd, Units = l.Units, DurationMs = l.DurationMs, ReferenceId = l.ReferenceId, Note = l.Note,
        }).ToList();

        return new AiUsageReportDto
        {
            Days = days, Today = perDay[^1], Total = total, PerDay = perDay, Breakdown = breakdown, Recent = recent,
        };
    }
}
