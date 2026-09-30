using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.AdmitCards;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class AdmitCardService : IAdmitCardService
{
    private readonly AppDbContext _db;

    public AdmitCardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AdmitCardListItemDto>> GetAllAsync(bool includeInactive = false)
    {
        var query = _db.AdmitCards.AsNoTracking().Include(a => a.Category).AsQueryable();
        if (!includeInactive) query = query.Where(a => a.IsActive);

        var items = await query.OrderByDescending(a => a.AdmitCardReleaseDate).ToListAsync();
        return items.Select(ToListItemDto).ToList();
    }

    public async Task<AdmitCardDto?> GetBySlugAsync(string slug)
    {
        var entity = await _db.AdmitCards.AsNoTracking().Include(a => a.Category)
            .FirstOrDefaultAsync(a => a.Slug == slug && a.IsActive);
        if (entity is null) return null;

        await _db.AdmitCards.Where(a => a.Id == entity.Id).ExecuteUpdateAsync(s => s.SetProperty(a => a.Views, a => a.Views + 1));
        entity.Views += 1;
        return ToFullDto(entity);
    }

    public async Task<AdmitCardDto?> GetByIdAsync(int id)
    {
        var entity = await _db.AdmitCards.AsNoTracking().Include(a => a.Category).FirstOrDefaultAsync(a => a.Id == id);
        return entity is null ? null : ToFullDto(entity);
    }

    public async Task<ServiceResult<AdmitCardDto>> CreateAsync(UpsertAdmitCardRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new AdmitCard
        {
            Title = request.Title,
            Slug = slug,
            ExamName = request.ExamName,
            OrganizationName = request.OrganizationName,
            OrganizationLogo = request.OrganizationLogo,
            CategoryId = request.CategoryId,
            AdmitCardReleaseDate = request.AdmitCardReleaseDate,
            ExamDate = request.ExamDate,
            DownloadLink = request.DownloadLink,
            AdmitCardPdf = request.AdmitCardPdf,
            PostName = request.PostName,
            Year = request.Year,
            State = request.State ?? string.Empty,
            District = request.District,
            Description = request.Description,
            Instructions = request.Instructions,
            HowToDownload = request.HowToDownload,
            ImportantNotes = request.ImportantNotes,
            IsFeatured = request.IsFeatured,
            IsActive = request.IsActive,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,
            DownloadCount = 0,
        };
        _db.AdmitCards.Add(entity);
        await _db.SaveChangesAsync();
        var saved = await _db.AdmitCards.Include(a => a.Category).FirstAsync(a => a.Id == entity.Id);
        return ServiceResult<AdmitCardDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<AdmitCardDto>> CreateFromAiImportAsync(AiImportAdmitCardRequest request, string userId)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        var uniqueSlug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new AdmitCard
        {
            Title = request.Title,
            Slug = uniqueSlug,
            ExamName = request.ExamName,
            OrganizationName = request.OrganizationName,
            CategoryId = request.CategoryId,
            AdmitCardReleaseDate = request.AdmitCardReleaseDate,
            ExamDate = request.ExamDate,
            DownloadLink = request.DownloadLink,
            AdmitCardPdf = request.AdmitCardPdf,
            PostName = request.PostName,
            Year = request.Year,
            State = request.State ?? request.Location ?? string.Empty,
            Description = request.Description,
            ShortDescription = request.ShortDescription,
            HowToDownload = request.HowToDownload,
            Instructions = request.InstructionsForExam.Count > 0 ? string.Join("\n", request.InstructionsForExam) : null,
            ImportantNotes = request.DocumentsToCarryForExam.Count > 0 ? string.Join("\n", request.DocumentsToCarryForExam) : null,
            IsFeatured = false,
            IsActive = request.AutoPublish,
            Status = request.AutoPublish ? 1 : 0,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,
            DownloadCount = 0,

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
        };
        _db.AdmitCards.Add(entity);
        await _db.SaveChangesAsync();
        var saved = await _db.AdmitCards.Include(a => a.Category).FirstAsync(a => a.Id == entity.Id);
        return ServiceResult<AdmitCardDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<AdmitCardDto>> UpdateAsync(int id, UpsertAdmitCardRequest request, string userId)
    {
        var entity = await _db.AdmitCards.FindAsync(id);
        if (entity is null) return ServiceResult<AdmitCardDto>.Fail("NotFound", "Admit card not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.Slug = slug;
        entity.ExamName = request.ExamName;
        entity.OrganizationName = request.OrganizationName;
        entity.OrganizationLogo = request.OrganizationLogo;
        entity.CategoryId = request.CategoryId;
        entity.AdmitCardReleaseDate = request.AdmitCardReleaseDate;
        entity.ExamDate = request.ExamDate;
        entity.DownloadLink = request.DownloadLink;
        entity.AdmitCardPdf = request.AdmitCardPdf;
        entity.PostName = request.PostName;
        entity.Year = request.Year;
        entity.State = request.State ?? string.Empty;
        entity.District = request.District;
        entity.Description = request.Description;
        entity.Instructions = request.Instructions;
        entity.HowToDownload = request.HowToDownload;
        entity.ImportantNotes = request.ImportantNotes;
        entity.IsFeatured = request.IsFeatured;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var saved = await _db.AdmitCards.Include(a => a.Category).FirstAsync(a => a.Id == id);
        return ServiceResult<AdmitCardDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.AdmitCards.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Admit card not found.");
        _db.AdmitCards.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.AdmitCards.AnyAsync(a => a.Slug == slug && a.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static string ComputeStatus(AdmitCard a) =>
        a.AdmitCardReleaseDate.Date <= DateTime.UtcNow.Date ? "Released" : "Upcoming";

    private static AdmitCardListItemDto ToListItemDto(AdmitCard a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        Slug = a.Slug,
        ExamName = a.ExamName,
        OrganizationName = a.OrganizationName,
        Category = a.Category?.Name ?? "General",
        ReleaseDate = a.AdmitCardReleaseDate.ToString("yyyy-MM-dd"),
        ExamDate = a.ExamDate?.ToString("yyyy-MM-dd"),
        Status = ComputeStatus(a),
        IsFeatured = a.IsFeatured,
        ViewsCount = a.Views,
    };

    private static AdmitCardDto ToFullDto(AdmitCard a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        Slug = a.Slug,
        ExamName = a.ExamName,
        OrganizationName = a.OrganizationName,
        OrganizationLogo = a.OrganizationLogo,
        Category = a.Category?.Name ?? "General",
        CategoryId = a.CategoryId,
        ReleaseDate = a.AdmitCardReleaseDate.ToString("yyyy-MM-dd"),
        ExamDate = a.ExamDate?.ToString("yyyy-MM-dd"),
        Status = ComputeStatus(a),
        DownloadUrl = a.DownloadLink ?? a.AdmitCardPdf,
        DownloadLink = a.DownloadLink,
        AdmitCardPdf = a.AdmitCardPdf,
        PostName = a.PostName,
        Year = a.Year,
        State = a.State,
        District = a.District,
        Description = a.Description,
        Instructions = a.Instructions,
        HowToDownload = a.HowToDownload,
        ImportantNotes = a.ImportantNotes,
        ViewsCount = a.Views,
        DownloadCount = a.DownloadCount,
        IsFeatured = a.IsFeatured,
        ShortDescription = a.ShortDescription,
        FocusKeyword = a.FocusKeyword,
        SecondaryKeywordsJson = a.SecondaryKeywordsJson,
        LsiKeywordsJson = a.LsiKeywordsJson,
        FaqSchemaJson = a.FaqSchemaJson,
        InternalLinkAnchorsJson = a.InternalLinkAnchorsJson,
        OgTitle = a.OgTitle,
        OgDescription = a.OgDescription,
        MetaTitle = a.MetaTitle,
        MetaDescription = a.MetaDescription,
        MetaKeywords = a.MetaKeywords,
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
                var request = MapRowToUpsertAdmitCardRequest(rows[i]);
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

    private static UpsertAdmitCardRequest MapRowToUpsertAdmitCardRequest(Dictionary<string, string> row)
    {
        string Get(string key) => row.TryGetValue(key, out var v) ? v.Trim() : "";
        string? GetOpt(string key) => string.IsNullOrWhiteSpace(Get(key)) ? null : Get(key);

        var title = Get("Title");
        if (string.IsNullOrWhiteSpace(title)) throw new FormatException("Title is required.");
        var organizationName = Get("OrganizationName");
        if (string.IsNullOrWhiteSpace(organizationName)) throw new FormatException("OrganizationName is required.");

        var releaseDateRaw = Get("AdmitCardReleaseDate");
        var releaseDate = string.IsNullOrWhiteSpace(releaseDateRaw) ? DateTime.UtcNow
            : DateTime.TryParse(releaseDateRaw, out var rd) ? rd
            : throw new FormatException("AdmitCardReleaseDate must be a valid date if provided.");

        return new UpsertAdmitCardRequest
        {
            Title = title,
            Slug = GetOpt("Slug"),
            ExamName = GetOpt("ExamName"),
            OrganizationName = organizationName,
            OrganizationLogo = GetOpt("OrganizationLogo"),
            CategoryId = int.TryParse(Get("CategoryId"), out var categoryId) ? categoryId : null,
            AdmitCardReleaseDate = releaseDate,
            ExamDate = DateTime.TryParse(Get("ExamDate"), out var ed) ? ed : null,
            DownloadLink = GetOpt("DownloadLink"),
            AdmitCardPdf = GetOpt("AdmitCardPdf"),
            PostName = GetOpt("PostName"),
            Year = int.TryParse(Get("Year"), out var year) ? year : null,
            State = GetOpt("State"),
            District = GetOpt("District"),
            Description = GetOpt("Description"),
            Instructions = GetOpt("Instructions"),
            HowToDownload = GetOpt("HowToDownload"),
            ImportantNotes = GetOpt("ImportantNotes"),
            IsFeatured = ParseBoolCell(Get("IsFeatured")),
            IsActive = string.IsNullOrWhiteSpace(Get("IsActive")) || ParseBoolCell(Get("IsActive")),
        };
    }

    private static bool ParseBoolCell(string value) =>
        value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1" || value.Equals("yes", StringComparison.OrdinalIgnoreCase);

    public async Task<string> ExportCsvAsync()
    {
        var admitCards = await _db.AdmitCards.AsNoTracking().OrderByDescending(a => a.CreatedDate).ToListAsync();
        var headers = new[]
        {
            "Title", "Slug", "ExamName", "OrganizationName", "OrganizationLogo", "CategoryId", "AdmitCardReleaseDate",
            "ExamDate", "DownloadLink", "AdmitCardPdf", "PostName", "Year", "State", "District", "Description",
            "Instructions", "HowToDownload", "ImportantNotes", "IsFeatured", "IsActive",
        };
        var rows = admitCards.Select(a => new List<string?>
        {
            a.Title, a.Slug, a.ExamName, a.OrganizationName, a.OrganizationLogo, a.CategoryId?.ToString(),
            a.AdmitCardReleaseDate.ToString("yyyy-MM-dd"), a.ExamDate?.ToString("yyyy-MM-dd"), a.DownloadLink,
            a.AdmitCardPdf, a.PostName, a.Year?.ToString(), a.State, a.District, a.Description,
            a.Instructions, a.HowToDownload, a.ImportantNotes, a.IsFeatured.ToString(), a.IsActive.ToString(),
        });
        return CsvUtil.Write(headers, rows);
    }
}
