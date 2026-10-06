using JobPortal.Application.DTOs.Usage;

namespace JobPortal.Application.Interfaces;

public interface IAiUsageService
{
    /// <summary>Records one AI call. Never throws: usage bookkeeping must not break the work it measures.</summary>
    Task RecordAsync(AiUsageEntry entry);

    /// <summary>Usage for the last <paramref name="days"/> days (including today), grouped for the admin "AI usage" tab.</summary>
    Task<AiUsageReportDto> GetReportAsync(int days = 7);
}
