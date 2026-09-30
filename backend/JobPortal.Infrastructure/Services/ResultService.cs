using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Results;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class ResultService : IResultService
{
    private readonly AppDbContext _db;

    public ResultService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ResultListItemDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.Results.AsNoTracking().Include(r => r.Category).AsQueryable();
        if (!includeInactive) query = query.Where(r => r.IsActive);

        var items = await query.OrderByDescending(r => r.ResultDate).ToListAsync();
        return items.Select(ToListItemDto).ToList();
    }

    public async Task<ResultDto?> GetBySlugAsync(string slug)
    {
        var entity = await _db.Results.AsNoTracking().Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.Slug == slug && r.IsActive);
        if (entity is null) return null;

        await _db.Results.Where(r => r.Id == entity.Id).ExecuteUpdateAsync(s => s.SetProperty(r => r.Views, r => r.Views + 1));
        entity.Views += 1;
        return ToFullDto(entity);
    }

    public async Task<ResultDto?> GetByIdAsync(int id)
    {
        var entity = await _db.Results.AsNoTracking().Include(r => r.Category).FirstOrDefaultAsync(r => r.Id == id);
        return entity is null ? null : ToFullDto(entity);
    }

    public async Task<ServiceResult<ResultDto>> CreateAsync(UpsertResultRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new Result
        {
            Title = request.Title,
            Slug = slug,
            ExamName = request.ExamName,
            OrganizationName = request.OrganizationName,
            OrganizationLogo = request.OrganizationLogo,
            CategoryId = request.CategoryId,
            ResultDate = request.ResultDate,
            ExamDate = request.ExamDate,
            ResultLink = request.ResultLink,
            ResultPdf = request.ResultPdf,
            CutOffMarks = request.CutOffMarks,
            SelectedCandidates = request.SelectedCandidates,
            State = request.State ?? string.Empty,
            District = request.District,
            Description = request.Description,
            IsFeatured = request.IsFeatured,
            IsActive = request.IsActive,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,
        };
        _db.Results.Add(entity);
        await _db.SaveChangesAsync();
        var saved = await _db.Results.Include(r => r.Category).FirstAsync(r => r.Id == entity.Id);
        return ServiceResult<ResultDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<ResultDto>> CreateFromAiImportAsync(AiImportResultRequest request, string userId)
    {
        var categoryExists = await _db.Categories.AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists) return ServiceResult<ResultDto>.Fail("InvalidCategory", "Category does not exist.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        var uniqueSlug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new Result
        {
            Title = request.Title,
            Slug = uniqueSlug,
            ExamName = request.ExamName,
            OrganizationName = request.OrganizationName,
            CategoryId = request.CategoryId,
            ResultDate = request.ResultDate,
            ExamDate = request.ExamDate,
            ResultLink = request.ResultLink,
            ResultPdf = request.ResultPdf,
            CutOffMarks = request.CutOffMarks,
            SelectedCandidates = request.SelectedCandidates,
            State = request.State ?? request.Location ?? string.Empty,
            Description = request.Description,
            ShortDescription = request.ShortDescription,
            IsFeatured = false,
            IsActive = request.AutoPublish,
            Status = request.AutoPublish ? 1 : 0,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,

            MetaTitle = request.MetaTitle,
            MetaDescription = request.MetaDescription,
            MetaKeywords = request.MetaKeywords,
            FocusKeyword = request.FocusKeyword,
            OgTitle = request.OgTitle,
            OgDescription = request.OgDescription,

            SecondaryKeywordsJson = JsonSerializer.Serialize(request.SecondaryKeywords),
            LsiKeywordsJson = JsonSerializer.Serialize(request.LsiKeywords),
            InternalLinkAnchorsJson = JsonSerializer.Serialize(request.InternalLinkAnchors),
            FaqSchemaJson = JsonSerializer.Serialize(request.FaqSchema),
            CutOffBreakdownJson = request.CutOffBreakdown.Count > 0 ? JsonSerializer.Serialize(request.CutOffBreakdown) : null,
        };
        _db.Results.Add(entity);
        await _db.SaveChangesAsync();
        var saved = await _db.Results.Include(r => r.Category).FirstAsync(r => r.Id == entity.Id);
        return ServiceResult<ResultDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<ResultDto>> UpdateAsync(int id, UpsertResultRequest request, string userId)
    {
        var entity = await _db.Results.FindAsync(id);
        if (entity is null) return ServiceResult<ResultDto>.Fail("NotFound", "Result not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.Slug = slug;
        entity.ExamName = request.ExamName;
        entity.OrganizationName = request.OrganizationName;
        entity.OrganizationLogo = request.OrganizationLogo;
        entity.CategoryId = request.CategoryId;
        entity.ResultDate = request.ResultDate;
        entity.ExamDate = request.ExamDate;
        entity.ResultLink = request.ResultLink;
        entity.ResultPdf = request.ResultPdf;
        entity.CutOffMarks = request.CutOffMarks;
        entity.SelectedCandidates = request.SelectedCandidates;
        entity.State = request.State ?? string.Empty;
        entity.District = request.District;
        entity.Description = request.Description;
        entity.IsFeatured = request.IsFeatured;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var saved = await _db.Results.Include(r => r.Category).FirstAsync(r => r.Id == id);
        return ServiceResult<ResultDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.Results.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Result not found.");
        _db.Results.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Results.AnyAsync(r => r.Slug == slug && r.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static ResultListItemDto ToListItemDto(Result r) => new()
    {
        Id = r.Id,
        Title = r.Title,
        Slug = r.Slug,
        ExamName = r.ExamName,
        OrganizationName = r.OrganizationName,
        Category = r.Category?.Name ?? "General",
        ResultDate = r.ResultDate.ToString("yyyy-MM-dd"),
        IsFeatured = r.IsFeatured,
        ViewsCount = r.Views,
    };

    private static ResultDto ToFullDto(Result r) => new()
    {
        Id = r.Id,
        Title = r.Title,
        Slug = r.Slug,
        ExamName = r.ExamName,
        OrganizationName = r.OrganizationName,
        OrganizationLogo = r.OrganizationLogo,
        Category = r.Category?.Name ?? "General",
        CategoryId = r.CategoryId,
        ResultDate = r.ResultDate.ToString("yyyy-MM-dd"),
        ExamDate = r.ExamDate?.ToString("yyyy-MM-dd"),
        ResultLink = r.ResultLink,
        ResultPdf = r.ResultPdf,
        CutOffMarks = r.CutOffMarks,
        SelectedCandidates = r.SelectedCandidates,
        State = r.State,
        District = r.District,
        Description = r.Description,
        ViewsCount = r.Views,
        IsFeatured = r.IsFeatured,
        ShortDescription = r.ShortDescription,
        FocusKeyword = r.FocusKeyword,
        SecondaryKeywordsJson = r.SecondaryKeywordsJson,
        LsiKeywordsJson = r.LsiKeywordsJson,
        FaqSchemaJson = r.FaqSchemaJson,
        InternalLinkAnchorsJson = r.InternalLinkAnchorsJson,
        CutOffBreakdownJson = r.CutOffBreakdownJson,
        OgTitle = r.OgTitle,
        OgDescription = r.OgDescription,
        MetaTitle = r.MetaTitle,
        MetaDescription = r.MetaDescription,
        MetaKeywords = r.MetaKeywords,
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
                var request = MapRowToUpsertResultRequest(rows[i]);
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

    private static UpsertResultRequest MapRowToUpsertResultRequest(Dictionary<string, string> row)
    {
        string Get(string key) => row.TryGetValue(key, out var v) ? v.Trim() : "";
        string? GetOpt(string key) => string.IsNullOrWhiteSpace(Get(key)) ? null : Get(key);

        var title = Get("Title");
        if (string.IsNullOrWhiteSpace(title)) throw new FormatException("Title is required.");
        var organizationName = Get("OrganizationName");
        if (string.IsNullOrWhiteSpace(organizationName)) throw new FormatException("OrganizationName is required.");

        var resultDateRaw = Get("ResultDate");
        var resultDate = string.IsNullOrWhiteSpace(resultDateRaw) ? DateTime.UtcNow
            : DateTime.TryParse(resultDateRaw, out var rd) ? rd
            : throw new FormatException("ResultDate must be a valid date if provided.");

        return new UpsertResultRequest
        {
            Title = title,
            Slug = GetOpt("Slug"),
            ExamName = GetOpt("ExamName"),
            OrganizationName = organizationName,
            OrganizationLogo = GetOpt("OrganizationLogo"),
            CategoryId = int.TryParse(Get("CategoryId"), out var categoryId) ? categoryId : null,
            ResultDate = resultDate,
            ExamDate = DateTime.TryParse(Get("ExamDate"), out var ed) ? ed : null,
            ResultLink = GetOpt("ResultLink"),
            ResultPdf = GetOpt("ResultPdf"),
            CutOffMarks = GetOpt("CutOffMarks"),
            SelectedCandidates = GetOpt("SelectedCandidates"),
            State = GetOpt("State"),
            District = GetOpt("District"),
            Description = GetOpt("Description"),
            IsFeatured = ParseBoolCell(Get("IsFeatured")),
            IsActive = string.IsNullOrWhiteSpace(Get("IsActive")) || ParseBoolCell(Get("IsActive")),
        };
    }

    private static bool ParseBoolCell(string value) =>
        value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1" || value.Equals("yes", StringComparison.OrdinalIgnoreCase);

    public async Task<string> ExportCsvAsync()
    {
        var results = await _db.Results.AsNoTracking().OrderByDescending(r => r.CreatedDate).ToListAsync();
        var headers = new[]
        {
            "Title", "Slug", "ExamName", "OrganizationName", "OrganizationLogo", "CategoryId", "ResultDate",
            "ExamDate", "ResultLink", "ResultPdf", "CutOffMarks", "SelectedCandidates", "State", "District",
            "Description", "IsFeatured", "IsActive",
        };
        var rows = results.Select(r => new List<string?>
        {
            r.Title, r.Slug, r.ExamName, r.OrganizationName, r.OrganizationLogo, r.CategoryId?.ToString(),
            r.ResultDate.ToString("yyyy-MM-dd"), r.ExamDate?.ToString("yyyy-MM-dd"), r.ResultLink, r.ResultPdf,
            r.CutOffMarks, r.SelectedCandidates, r.State, r.District, r.Description, r.IsFeatured.ToString(), r.IsActive.ToString(),
        });
        return CsvUtil.Write(headers, rows);
    }
}
