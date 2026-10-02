using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.AdmitCards;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.GovtSchemes;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.DTOs.News;
using JobPortal.Application.DTOs.OldPapers;
using JobPortal.Application.DTOs.Results;
using JobPortal.Application.DTOs.StudyMaterials;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

/// <summary>Review queue for AI-collected non-job content. Ingest validates the payload against the target
/// category's create-request type so the agent gets immediate feedback; approve then publishes through that
/// category's existing create service, so slugs, SEO fields and alert dispatch behave exactly as for manual posts.</summary>
public class ContentDraftService : IContentDraftService
{
    private static readonly JsonSerializerOptions ReadOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly JsonSerializerOptions WriteOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly AppDbContext _db;
    private readonly IResultService _results;
    private readonly IAdmitCardService _admitCards;
    private readonly INewsService _news;
    private readonly IGovtSchemeService _schemes;
    private readonly IOldPaperService _oldPapers;
    private readonly IStudyMaterialService _study;

    public ContentDraftService(AppDbContext db, IResultService results, IAdmitCardService admitCards, INewsService news,
        IGovtSchemeService schemes, IOldPaperService oldPapers, IStudyMaterialService study)
    {
        _db = db;
        _results = results;
        _admitCards = admitCards;
        _news = news;
        _schemes = schemes;
        _oldPapers = oldPapers;
        _study = study;
    }

    private static string Norm(string? s) => Regex.Replace((s ?? "").Trim().ToLowerInvariant(), @"\s+", " ");

    private static string Hash(string basis) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(basis))).ToLowerInvariant();

    private static ContentDraftListItemDto ToListItem(ContentDraft d) => new()
    {
        Id = d.Id, Category = d.Category, SourceName = d.SourceName, SourceUrl = d.SourceUrl,
        Title = d.Title, Summary = d.Summary, Status = d.Status, CreatedDate = d.CreatedDate,
    };

    private static ContentDraftDto ToDto(ContentDraft d) => new()
    {
        Id = d.Id, Category = d.Category, SourceName = d.SourceName, SourceUrl = d.SourceUrl,
        Title = d.Title, Summary = d.Summary, Status = d.Status, CreatedDate = d.CreatedDate,
        Payload = JsonDocument.Parse(d.PayloadJson).RootElement.Clone(),
        CreatedEntityId = d.CreatedEntityId, ReviewedAt = d.ReviewedAt, ReviewNotes = d.ReviewNotes,
    };

    public async Task<PagedResult<ContentDraftListItemDto>> SearchAsync(string? category, int? status, int page = 1, int pageSize = 20)
    {
        var q = _db.ContentDrafts.AsNoTracking().Where(d => d.IsActive);
        if (!string.IsNullOrEmpty(category)) q = q.Where(d => d.Category == category);
        if (status.HasValue) q = q.Where(d => d.Status == status.Value);
        q = q.OrderByDescending(d => d.CreatedDate);

        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<ContentDraftListItemDto>
        {
            Items = items.Select(ToListItem).ToList(), Page = page, PageSize = pageSize, TotalCount = total,
        };
    }

    public async Task<ContentDraftDto?> GetByIdAsync(int id)
    {
        var d = await _db.ContentDrafts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
        return d is null ? null : ToDto(d);
    }

    public async Task<List<ContentCategorySummaryDto>> GetSummaryAsync()
    {
        var counts = await _db.ContentDrafts.AsNoTracking().Where(d => d.IsActive)
            .GroupBy(d => new { d.Category, d.Status })
            .Select(g => new { g.Key.Category, g.Key.Status, Count = g.Count() })
            .ToListAsync();

        var runs = await _db.ContentSyncRuns.AsNoTracking()
            .OrderByDescending(r => r.StartedAt).Take(200).ToListAsync();

        return ContentCategories.All.Select(c =>
        {
            var last = runs.FirstOrDefault(r => r.Category == c);
            return new ContentCategorySummaryDto
            {
                Category = c,
                PendingCount = counts.Where(x => x.Category == c && x.Status == ContentDraftStatus.Pending).Sum(x => x.Count),
                ApprovedCount = counts.Where(x => x.Category == c && x.Status == ContentDraftStatus.Approved).Sum(x => x.Count),
                RejectedCount = counts.Where(x => x.Category == c && x.Status == ContentDraftStatus.Rejected).Sum(x => x.Count),
                LastRun = last is null ? null : ContentSyncService.ToDto(last),
            };
        }).ToList();
    }

    // ---- Ingest -------------------------------------------------------------------------------

    private static string? ValidationMessage(object payload)
    {
        var results = new List<ValidationResult>();
        return Validator.TryValidateObject(payload, new ValidationContext(payload), results, validateAllProperties: true)
            ? null
            : string.Join("; ", results.Select(r => r.ErrorMessage));
    }

    private static string? MissingFields(params (string Name, string? Value)[] required)
    {
        var missing = required.Where(r => string.IsNullOrWhiteSpace(r.Value)).Select(r => r.Name).ToList();
        return missing.Count == 0 ? null : "Missing required field(s): " + string.Join(", ", missing);
    }

    /// <summary>Deserializes the payload into the category's request type, validates it, and derives
    /// (title, dedupe basis, duplicate-of-published check). Returns an error message on invalid payloads.</summary>
    private async Task<(string? Error, string Title, string DedupeBasis, bool AlreadyPublished, string? Summary)> InspectAsync(
        string category, JsonElement payload)
    {
        const string bad = "Payload doesn't match the expected shape: ";
        try
        {
            switch (category)
            {
                case ContentCategories.Result:
                {
                    var p = payload.Deserialize<AiImportResultRequest>(ReadOptions)!;
                    var err = MissingFields(("title", p.Title), ("organizationName", p.OrganizationName), ("focusKeyword", p.FocusKeyword),
                        ("shortDescription", p.ShortDescription), ("description", p.Description),
                        ("metaTitle", p.MetaTitle), ("metaDescription", p.MetaDescription));
                    if (err is null && p.CategoryId <= 0) err = "Missing required field(s): categoryId";
                    if (err is not null) return (err, "", "", false, null);
                    var t = Norm(p.Title);
                    return (null, p.Title.Trim(), $"result|{t}|{p.ResultDate:yyyy-MM-dd}",
                        await _db.Results.AsNoTracking().AnyAsync(r => r.Title.ToLower() == t), p.ShortDescription);
                }
                case ContentCategories.AdmitCard:
                {
                    var p = payload.Deserialize<AiImportAdmitCardRequest>(ReadOptions)!;
                    var err = MissingFields(("title", p.Title), ("organizationName", p.OrganizationName), ("focusKeyword", p.FocusKeyword),
                        ("shortDescription", p.ShortDescription), ("description", p.Description),
                        ("metaTitle", p.MetaTitle), ("metaDescription", p.MetaDescription));
                    if (err is null && p.CategoryId <= 0) err = "Missing required field(s): categoryId";
                    if (err is not null) return (err, "", "", false, null);
                    var t = Norm(p.Title);
                    return (null, p.Title.Trim(), $"admitcard|{t}|{p.AdmitCardReleaseDate:yyyy-MM-dd}",
                        await _db.AdmitCards.AsNoTracking().AnyAsync(r => r.Title.ToLower() == t), p.ShortDescription);
                }
                case ContentCategories.News:
                {
                    var p = payload.Deserialize<UpsertNewsRequest>(ReadOptions)!;
                    var err = ValidationMessage(p);
                    if (err is not null) return (err, "", "", false, null);
                    var t = Norm(p.Title);
                    var basis = string.IsNullOrWhiteSpace(p.SourceLink) ? $"news|{t}" : $"news|{Norm(p.SourceLink)}";
                    return (null, p.Title.Trim(), basis,
                        await _db.News.AsNoTracking().AnyAsync(r => r.Title.ToLower() == t), p.Summary);
                }
                case ContentCategories.Scheme:
                {
                    var p = payload.Deserialize<UpsertGovtSchemeRequest>(ReadOptions)!;
                    var err = ValidationMessage(p);
                    if (err is not null) return (err, "", "", false, null);
                    var t = Norm(p.Title);
                    return (null, p.Title.Trim(), $"scheme|{t}",
                        await _db.GovtSchemes.AsNoTracking().AnyAsync(r => r.Title.ToLower() == t), p.Benefits.Length > 300 ? p.Benefits[..300] : p.Benefits);
                }
                case ContentCategories.OldPaper:
                {
                    var p = payload.Deserialize<UpsertOldPaperRequest>(ReadOptions)!;
                    var err = ValidationMessage(p);
                    if (err is not null) return (err, "", "", false, null);
                    var t = Norm(p.Title);
                    return (null, p.Title.Trim(), $"oldpaper|{Norm(p.ExamName)}|{p.Year}|{Norm(p.Subject)}|{Norm(p.PaperType)}",
                        await _db.OldPapers.AsNoTracking().AnyAsync(r => r.Title.ToLower() == t), $"{p.ExamName} · {p.Year}");
                }
                case ContentCategories.Study:
                {
                    var p = payload.Deserialize<UpsertStudyMaterialRequest>(ReadOptions)!;
                    var err = ValidationMessage(p);
                    if (err is not null) return (err, "", "", false, null);
                    var t = Norm(p.Title);
                    return (null, p.Title.Trim(), $"study|{t}",
                        await _db.ExamMaterials.AsNoTracking().AnyAsync(r => r.Title.ToLower() == t),
                        p.Description.Length > 300 ? p.Description[..300] : p.Description);
                }
                default:
                    return ("Unknown category.", "", "", false, null);
            }
        }
        catch (JsonException ex)
        {
            return (bad + ex.Message, "", "", false, null);
        }
    }

    public async Task<ServiceResult<ContentDraftIngestResultDto>> IngestAsync(IngestContentDraftRequest request)
    {
        var category = request.Category.Trim().ToLowerInvariant();
        if (!ContentCategories.IsValid(category))
            return ServiceResult<ContentDraftIngestResultDto>.Fail("InvalidCategory",
                $"Category must be one of: {string.Join(", ", ContentCategories.All)}.");

        var (error, title, basis, alreadyPublished, summary) = await InspectAsync(category, request.Payload);
        if (error is not null)
        {
            await BumpRunAsync(request.RunId, invalid: 1);
            return ServiceResult<ContentDraftIngestResultDto>.Fail("InvalidPayload", error);
        }

        var dedupeKey = Hash(basis);
        var existing = await _db.ContentDrafts.AsNoTracking().FirstOrDefaultAsync(d => d.DedupeKey == dedupeKey);
        if (existing is not null)
        {
            await BumpRunAsync(request.RunId, skipped: 1);
            // Approved, rejected, or removed → admin already dealt with it.
            var outcome = existing.IsActive && existing.Status == ContentDraftStatus.Pending
                ? ContentIngestOutcome.SkippedPending : ContentIngestOutcome.SkippedReviewed;
            return ServiceResult<ContentDraftIngestResultDto>.Ok(new() { Outcome = outcome, Draft = ToListItem(existing) });
        }

        if (alreadyPublished)
        {
            await BumpRunAsync(request.RunId, skipped: 1);
            return ServiceResult<ContentDraftIngestResultDto>.Ok(new() { Outcome = ContentIngestOutcome.SkippedPublished });
        }

        var entity = new ContentDraft
        {
            Category = category,
            SourceName = request.SourceName.Trim(),
            SourceUrl = request.SourceUrl,
            DedupeKey = dedupeKey,
            Title = title.Length > 300 ? title[..300] : title,
            Summary = Truncate(request.Summary ?? summary, 500),
            PayloadJson = JsonSerializer.Serialize(request.Payload, WriteOptions),
            Status = ContentDraftStatus.Pending,
            SyncRunId = request.RunId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        _db.ContentDrafts.Add(entity);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Lost a race with a concurrent ingest of the same item — the unique DedupeKey rejected ours.
            _db.Entry(entity).State = EntityState.Detached;
            var raced = await _db.ContentDrafts.AsNoTracking().FirstOrDefaultAsync(d => d.DedupeKey == dedupeKey);
            if (raced is null) throw;
            await BumpRunAsync(request.RunId, skipped: 1);
            return ServiceResult<ContentDraftIngestResultDto>.Ok(new() { Outcome = ContentIngestOutcome.SkippedPending, Draft = ToListItem(raced) });
        }

        await BumpRunAsync(request.RunId, created: 1);
        return ServiceResult<ContentDraftIngestResultDto>.Ok(new() { Outcome = ContentIngestOutcome.Created, Draft = ToListItem(entity) });
    }

    private static string? Truncate(string? s, int max) => s is null ? null : (s.Length > max ? s[..max] : s);

    private async Task BumpRunAsync(int? runId, int created = 0, int skipped = 0, int invalid = 0)
    {
        if (runId is null) return;
        await _db.ContentSyncRuns.Where(r => r.Id == runId.Value).ExecuteUpdateAsync(s => s
            .SetProperty(r => r.NewCount, r => r.NewCount + created)
            .SetProperty(r => r.SkippedCount, r => r.SkippedCount + skipped)
            .SetProperty(r => r.InvalidCount, r => r.InvalidCount + invalid));
    }

    // ---- Review -------------------------------------------------------------------------------

    public async Task<ServiceResult<ContentApprovedResultDto>> ApproveAsync(int id, ApproveContentDraftRequest request, string userId)
    {
        var draft = await _db.ContentDrafts.FindAsync(id);
        if (draft is null || !draft.IsActive) return ServiceResult<ContentApprovedResultDto>.Fail("NotFound", "Draft not found.");
        if (draft.Status != ContentDraftStatus.Pending)
            return ServiceResult<ContentApprovedResultDto>.Fail("AlreadyReviewed", "This draft has already been reviewed.");

        var json = request.Payload.HasValue && request.Payload.Value.ValueKind == JsonValueKind.Object
            ? request.Payload.Value.GetRawText()
            : draft.PayloadJson;

        ServiceResult<int> created;
        try
        {
            created = await PublishAsync(draft.Category, json, userId);
        }
        catch (JsonException ex)
        {
            return ServiceResult<ContentApprovedResultDto>.Fail("InvalidPayload", "Payload doesn't match the expected shape: " + ex.Message);
        }
        if (!created.Succeeded)
            return ServiceResult<ContentApprovedResultDto>.Fail(created.ErrorCode ?? "PublishFailed", created.Error ?? "Could not publish.");

        draft.Status = ContentDraftStatus.Approved;
        draft.CreatedEntityId = created.Data;
        draft.ReviewedById = userId;
        draft.ReviewedAt = DateTime.UtcNow;
        draft.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult<ContentApprovedResultDto>.Ok(new() { CreatedEntityId = created.Data });
    }

    /// <summary>The per-category services only swap spaces and '/' when slugging a title, so an AI headline like
    /// "GPSC Opens 26 Posts; Apply by 8 Oct" would become a slug containing ';'. Supply a clean slug up front
    /// unless the payload already carries one.</summary>
    public static string WithCleanSlug(string json)
    {
        if (JsonNode.Parse(json) is not JsonObject obj) return json;
        var existing = obj["slug"]?.GetValue<string>();
        if (!string.IsNullOrWhiteSpace(existing)) return json;
        var slug = CleanSlug(obj["title"]?.GetValue<string>());
        if (slug.Length == 0) return json;
        obj["slug"] = slug;
        return obj.ToJsonString();
    }

    public static string CleanSlug(string? title)
    {
        var s = Regex.Replace((title ?? "").ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        if (s.Length <= 100) return s;
        var cut = s[..100];
        var lastDash = cut.LastIndexOf('-');
        return (lastDash > 40 ? cut[..lastDash] : cut).Trim('-');
    }

    private async Task<ServiceResult<int>> PublishAsync(string category, string json, string userId)
    {
        json = WithCleanSlug(json);
        static ServiceResult<int> Map<T>(ServiceResult<T> r, Func<T, int> id) =>
            r.Succeeded ? ServiceResult<int>.Ok(id(r.Data!)) : ServiceResult<int>.Fail(r.ErrorCode ?? "PublishFailed", r.Error ?? "Could not publish.");

        switch (category)
        {
            case ContentCategories.Result:
                return Map(await _results.CreateFromAiImportAsync(JsonSerializer.Deserialize<AiImportResultRequest>(json, ReadOptions)!, userId), d => d.Id);
            case ContentCategories.AdmitCard:
                return Map(await _admitCards.CreateFromAiImportAsync(JsonSerializer.Deserialize<AiImportAdmitCardRequest>(json, ReadOptions)!, userId), d => d.Id);
            case ContentCategories.News:
                return Map(await _news.CreateAsync(JsonSerializer.Deserialize<UpsertNewsRequest>(json, ReadOptions)!, userId), d => d.Id);
            case ContentCategories.Scheme:
                return Map(await _schemes.CreateAsync(JsonSerializer.Deserialize<UpsertGovtSchemeRequest>(json, ReadOptions)!, userId), d => d.Id);
            case ContentCategories.OldPaper:
                return Map(await _oldPapers.CreateAsync(JsonSerializer.Deserialize<UpsertOldPaperRequest>(json, ReadOptions)!, userId), d => d.Id);
            case ContentCategories.Study:
                return Map(await _study.CreateAsync(JsonSerializer.Deserialize<UpsertStudyMaterialRequest>(json, ReadOptions)!), d => d.Id);
            default:
                return ServiceResult<int>.Fail("InvalidCategory", "Unknown category.");
        }
    }

    public async Task<ServiceResult> RejectAsync(int id, RejectContentDraftRequest request, string userId)
    {
        var draft = await _db.ContentDrafts.FindAsync(id);
        if (draft is null || !draft.IsActive) return ServiceResult.Fail("NotFound", "Draft not found.");
        if (draft.Status != ContentDraftStatus.Pending)
            return ServiceResult.Fail("AlreadyReviewed", "This draft has already been reviewed.");

        draft.Status = ContentDraftStatus.Rejected;
        draft.ReviewNotes = request.ReviewNotes;
        draft.ReviewedById = userId;
        draft.ReviewedAt = DateTime.UtcNow;
        draft.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var draft = await _db.ContentDrafts.FindAsync(id);
        if (draft is null || !draft.IsActive) return ServiceResult.Fail("NotFound", "Draft not found.");

        // Hide, don't delete: the row is what stops the next sync from re-importing this item as new.
        draft.IsActive = false;
        draft.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
