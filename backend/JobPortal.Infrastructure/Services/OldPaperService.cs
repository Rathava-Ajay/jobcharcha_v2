using JobPortal.Application.Common;
using JobPortal.Application.DTOs.OldPapers;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class OldPaperService : IOldPaperService
{
    private readonly AppDbContext _db;

    public OldPaperService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<OldPaperListItemDto>> SearchAsync(int? categoryId, int? year, string? search)
    {
        var query = _db.OldPapers.AsNoTracking().Include(p => p.Category)
            .Where(p => p.IsActive).AsQueryable();
        if (categoryId.HasValue) query = query.Where(p => p.CategoryId == categoryId.Value);
        if (year.HasValue) query = query.Where(p => p.Year == year.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(p => EF.Functions.Like(p.Title, $"%{s}%") || EF.Functions.Like(p.ExamName, $"%{s}%"));
        }

        var papers = await query.OrderByDescending(p => p.Year).ThenByDescending(p => p.IsFeatured).ToListAsync();
        return papers.Select(ToListItemDto).ToList();
    }

    public async Task<OldPaperDetailDto?> GetBySlugAsync(string slug)
    {
        var paper = await _db.OldPapers.AsNoTracking().Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        return paper is null ? null : ToDetailDto(paper);
    }

    public async Task<List<int>> GetAvailableYearsAsync() =>
        await _db.OldPapers.AsNoTracking().Where(p => p.IsActive)
            .Select(p => p.Year).Distinct().OrderByDescending(y => y).ToListAsync();

    public async Task<string?> RegisterDownloadAsync(string slug)
    {
        var paper = await _db.OldPapers.FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        if (paper is null) return null;
        paper.Downloads += 1;
        await _db.SaveChangesAsync();
        return paper.PaperPdfLink;
    }

    public async Task<List<OldPaperDetailDto>> GetAllForAdminAsync()
    {
        var papers = await _db.OldPapers.AsNoTracking().Include(p => p.Category)
            .OrderByDescending(p => p.CreatedDate).ToListAsync();
        return papers.Select(ToDetailDto).ToList();
    }

    public async Task<ServiceResult<OldPaperDetailDto>> CreateAsync(UpsertOldPaperRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify($"{request.ExamName}-{request.Year}-{request.Title}") : Slugify(request.Slug);
        var uniqueSlug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new OldPaper
        {
            Title = request.Title,
            TitleGujarati = request.TitleGujarati,
            Slug = uniqueSlug,
            ExamName = request.ExamName,
            CategoryId = request.CategoryId,
            Year = request.Year,
            Description = request.Description,
            PaperPdfLink = request.PaperPdfLink,
            SolutionPdfLink = request.SolutionPdfLink,
            TotalQuestions = request.TotalQuestions,
            TotalMarks = request.TotalMarks,
            Duration = request.Duration,
            Subject = request.Subject,
            PaperType = request.PaperType,
            IsFeatured = request.IsFeatured,
            IsActive = request.IsActive,
            Downloads = 0,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
        };
        _db.OldPapers.Add(entity);
        await _db.SaveChangesAsync();

        var saved = await _db.OldPapers.Include(p => p.Category).FirstAsync(p => p.Id == entity.Id);
        return ServiceResult<OldPaperDetailDto>.Ok(ToDetailDto(saved));
    }

    public async Task<ServiceResult<OldPaperDetailDto>> UpdateAsync(int id, UpsertOldPaperRequest request)
    {
        var entity = await _db.OldPapers.FindAsync(id);
        if (entity is null) return ServiceResult<OldPaperDetailDto>.Fail("NotFound", "Old paper not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify($"{request.ExamName}-{request.Year}-{request.Title}") : Slugify(request.Slug);
        if (slug != entity.Slug)
            slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.TitleGujarati = request.TitleGujarati;
        entity.Slug = slug;
        entity.ExamName = request.ExamName;
        entity.CategoryId = request.CategoryId;
        entity.Year = request.Year;
        entity.Description = request.Description;
        entity.PaperPdfLink = request.PaperPdfLink;
        entity.SolutionPdfLink = request.SolutionPdfLink;
        entity.TotalQuestions = request.TotalQuestions;
        entity.TotalMarks = request.TotalMarks;
        entity.Duration = request.Duration;
        entity.Subject = request.Subject;
        entity.PaperType = request.PaperType;
        entity.IsFeatured = request.IsFeatured;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var saved = await _db.OldPapers.Include(p => p.Category).FirstAsync(p => p.Id == id);
        return ServiceResult<OldPaperDetailDto>.Ok(ToDetailDto(saved));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.OldPapers.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Old paper not found.");
        _db.OldPapers.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.OldPapers.AnyAsync(p => p.Slug == slug && p.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static OldPaperListItemDto ToListItemDto(OldPaper p) => new()
    {
        Id = p.Id,
        Title = p.Title,
        Slug = p.Slug,
        ExamName = p.ExamName,
        CategoryId = p.CategoryId,
        CategoryName = p.Category?.Name ?? "General",
        Year = p.Year,
        Subject = p.Subject,
        PaperType = p.PaperType,
        Downloads = p.Downloads,
        IsFeatured = p.IsFeatured,
    };

    private static OldPaperDetailDto ToDetailDto(OldPaper p) => new()
    {
        Id = p.Id,
        Title = p.Title,
        Slug = p.Slug,
        ExamName = p.ExamName,
        CategoryId = p.CategoryId,
        CategoryName = p.Category?.Name ?? "General",
        Year = p.Year,
        Subject = p.Subject,
        PaperType = p.PaperType,
        Downloads = p.Downloads,
        IsFeatured = p.IsFeatured,
        Description = p.Description,
        PaperPdfLink = p.PaperPdfLink,
        SolutionPdfLink = p.SolutionPdfLink,
        TotalQuestions = p.TotalQuestions,
        TotalMarks = p.TotalMarks,
        Duration = p.Duration,
        IsActive = p.IsActive,
    };

    public async Task<BulkImportResult> BulkImportAsync(string csvContent, string userId)
    {
        var rows = CsvUtil.Parse(csvContent);
        var result = new BulkImportResult { TotalRows = rows.Count };

        for (var i = 0; i < rows.Count; i++)
        {
            var rowNumber = i + 2;
            try
            {
                var request = MapRowToUpsertOldPaperRequest(rows[i]);
                var created = await CreateAsync(request, userId);
                if (created.Succeeded) result.SuccessCount++;
                else
                {
                    result.FailureCount++;
                    result.Errors.Add(new BulkImportRowError { RowNumber = rowNumber, Error = created.Error ?? created.ErrorCode ?? "Unknown error." });
                }
            }
            catch (FormatException ex)
            {
                result.FailureCount++;
                result.Errors.Add(new BulkImportRowError { RowNumber = rowNumber, Error = ex.Message });
            }
        }

        return result;
    }

    private static UpsertOldPaperRequest MapRowToUpsertOldPaperRequest(Dictionary<string, string> row)
    {
        string Get(string key) => row.TryGetValue(key, out var v) ? v.Trim() : "";
        string? GetOpt(string key) => string.IsNullOrWhiteSpace(Get(key)) ? null : Get(key);

        var title = Get("Title");
        if (string.IsNullOrWhiteSpace(title)) throw new FormatException("Title is required.");
        var examName = Get("ExamName");
        if (string.IsNullOrWhiteSpace(examName)) throw new FormatException("ExamName is required.");
        var paperPdfLink = Get("PaperPdfLink");
        if (string.IsNullOrWhiteSpace(paperPdfLink)) throw new FormatException("PaperPdfLink is required.");
        if (!int.TryParse(Get("Year"), out var year) || year < 1900) throw new FormatException("Year must be a valid 4-digit year.");

        return new UpsertOldPaperRequest
        {
            Title = title,
            TitleGujarati = GetOpt("TitleGujarati"),
            Slug = GetOpt("Slug"),
            ExamName = examName,
            CategoryId = int.TryParse(Get("CategoryId"), out var categoryId) ? categoryId : null,
            Year = year,
            Description = GetOpt("Description"),
            PaperPdfLink = paperPdfLink,
            SolutionPdfLink = GetOpt("SolutionPdfLink"),
            TotalQuestions = int.TryParse(Get("TotalQuestions"), out var tq) ? tq : null,
            TotalMarks = int.TryParse(Get("TotalMarks"), out var tm) ? tm : null,
            Duration = int.TryParse(Get("Duration"), out var dur) ? dur : null,
            Subject = GetOpt("Subject"),
            PaperType = GetOpt("PaperType"),
            IsFeatured = ParseBoolCell(Get("IsFeatured")),
            IsActive = string.IsNullOrWhiteSpace(Get("IsActive")) || ParseBoolCell(Get("IsActive")),
        };
    }

    private static bool ParseBoolCell(string value) =>
        value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1" || value.Equals("yes", StringComparison.OrdinalIgnoreCase);

    public async Task<string> ExportCsvAsync()
    {
        var papers = await _db.OldPapers.AsNoTracking().OrderByDescending(p => p.Year).ToListAsync();
        var headers = new[]
        {
            "Title", "TitleGujarati", "Slug", "ExamName", "CategoryId", "Year", "Description", "PaperPdfLink",
            "SolutionPdfLink", "TotalQuestions", "TotalMarks", "Duration", "Subject", "PaperType", "IsFeatured", "IsActive",
        };
        var rows = papers.Select(p => new List<string?>
        {
            p.Title, p.TitleGujarati, p.Slug, p.ExamName, p.CategoryId?.ToString(), p.Year.ToString(), p.Description,
            p.PaperPdfLink, p.SolutionPdfLink, p.TotalQuestions?.ToString(), p.TotalMarks?.ToString(), p.Duration?.ToString(),
            p.Subject, p.PaperType, p.IsFeatured.ToString(), p.IsActive.ToString(),
        });
        return CsvUtil.Write(headers, rows);
    }
}
