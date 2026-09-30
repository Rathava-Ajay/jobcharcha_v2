using JobPortal.Application.Common;
using JobPortal.Application.DTOs.CutOffs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class CutOffService : ICutOffService
{
    private static readonly string[] ValidCategories =
        { "General", "SC", "ST", "OBC", "EWS", "PwD", "ExServiceman", "Women" };

    private readonly AppDbContext _db;

    public CutOffService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CutOffExamOptionDto>> GetExamsAsync()
    {
        var grouped = await _db.CutOffRecords.AsNoTracking()
            .GroupBy(c => c.Slug)
            .Select(g => new
            {
                Slug = g.Key,
                ExamName = g.OrderByDescending(x => x.Year).Select(x => x.ExamName).First(),
                OrganizationName = g.OrderByDescending(x => x.Year).Select(x => x.OrganizationName).First(),
                RecordCount = g.Count(),
            })
            .OrderBy(x => x.ExamName)
            .ToListAsync();

        return grouped.Select(g => new CutOffExamOptionDto
        {
            Slug = g.Slug,
            ExamName = g.ExamName,
            OrganizationName = g.OrganizationName,
            RecordCount = g.RecordCount,
        }).ToList();
    }

    public async Task<List<string>> GetPostNamesAsync(string slug) =>
        await _db.CutOffRecords.AsNoTracking()
            .Where(c => c.Slug == slug)
            .Select(c => c.PostName)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync();

    public async Task<List<CutOffRecordDto>> SearchAsync(string? slug, int? year, string? postName)
    {
        var query = _db.CutOffRecords.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(slug)) query = query.Where(c => c.Slug == slug);
        if (year.HasValue) query = query.Where(c => c.Year == year.Value);
        if (!string.IsNullOrWhiteSpace(postName)) query = query.Where(c => c.PostName == postName);

        var records = await query.OrderByDescending(c => c.Year).ToListAsync();
        return records.Select(ToDto).ToList();
    }

    public async Task<ServiceResult<CutOffPredictionDto>> PredictAsync(string slug, string postName, string category)
    {
        if (!ValidCategories.Contains(category, StringComparer.OrdinalIgnoreCase))
            return ServiceResult<CutOffPredictionDto>.Fail("InvalidCategory", $"Category must be one of: {string.Join(", ", ValidCategories)}.");

        var records = await _db.CutOffRecords.AsNoTracking()
            .Where(c => c.Slug == slug && c.PostName == postName)
            .OrderBy(c => c.Year)
            .ToListAsync();
        if (records.Count == 0)
            return ServiceResult<CutOffPredictionDto>.Fail("NotFound", "No cutoff history found for this exam and post.");

        var points = records
            .Select(r => new { r.Year, Value = GetCategoryValue(r, category) })
            .Where(p => p.Value.HasValue)
            .Select(p => new CutOffHistoricalPointDto { Year = p.Year, CutOff = p.Value!.Value })
            .ToList();
        if (points.Count == 0)
            return ServiceResult<CutOffPredictionDto>.Fail("NotFound", $"No {category} category cutoff data found for this exam and post.");

        var last = points[^1];
        var first = points[0];
        var yearSpan = last.Year - first.Year;
        var delta = points.Count >= 2 && yearSpan > 0
            ? (last.CutOff - first.CutOff) / yearSpan
            : 0m;

        var predictedCutOff = Math.Max(0, Math.Round(last.CutOff + delta, 2));
        var trend = delta > 0.5m ? "Rising" : delta < -0.5m ? "Falling" : "Stable";
        var confidence = points.Count >= 4 ? "High" : points.Count >= 2 ? "Medium" : "Low";

        var sample = records[0];
        return ServiceResult<CutOffPredictionDto>.Ok(new CutOffPredictionDto
        {
            ExamName = sample.ExamName,
            OrganizationName = sample.OrganizationName,
            PostName = postName,
            Category = category,
            HistoricalPoints = points,
            PredictedYear = last.Year + 1,
            PredictedCutOff = predictedCutOff,
            Trend = trend,
            Confidence = confidence,
        });
    }

    private static decimal? GetCategoryValue(CutOffRecord r, string category) => category.ToLowerInvariant() switch
    {
        "general" => r.GeneralCutOff,
        "sc" => r.SccutOff,
        "st" => r.StcutOff,
        "obc" => r.ObccutOff,
        "ews" => r.EwscutOff,
        "pwd" => r.PwDcutOff,
        "exserviceman" => r.ExServicemanCutOff,
        "women" => r.WomenCutOff,
        _ => null,
    };

    private static CutOffRecordDto ToDto(CutOffRecord r) => new()
    {
        Id = r.Id,
        ExamName = r.ExamName,
        Slug = r.Slug,
        OrganizationName = r.OrganizationName,
        Year = r.Year,
        PostName = r.PostName,
        Series = r.Series,
        TotalPosts = r.TotalPosts,
        TotalCandidatesAppeared = r.TotalCandidatesAppeared,
        IsVerified = r.IsVerified,
        Categories = new CutOffCategoryValuesDto
        {
            General = r.GeneralCutOff,
            Sc = r.SccutOff,
            St = r.StcutOff,
            Obc = r.ObccutOff,
            Ews = r.EwscutOff,
            PwD = r.PwDcutOff,
            ExServiceman = r.ExServicemanCutOff,
            Women = r.WomenCutOff,
        },
    };
}
