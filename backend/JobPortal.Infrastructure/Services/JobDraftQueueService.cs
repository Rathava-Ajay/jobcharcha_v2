using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class JobDraftQueueService : IJobDraftQueueService
{
    private readonly AppDbContext _db;
    private readonly IJobService _jobService;

    public JobDraftQueueService(AppDbContext db, IJobService jobService)
    {
        _db = db;
        _jobService = jobService;
    }

    /// <summary>Same title|organization|deadline normalization as JobService.BuildFingerprint — kept as the
    /// raw string (not hashed) so it can be matched directly against Jobs.DuplicateFingerprint, in addition
    /// to being hashed below for JobDraftQueue.DedupeKey.</summary>
    private static string BuildRawFingerprint(string title, string? organizationName, DateTime? lastDate)
    {
        static string Normalize(string? s) => Regex.Replace((s ?? "").Trim().ToLowerInvariant(), @"\s+", " ");
        return $"{Normalize(title)}|{Normalize(organizationName)}|{(lastDate.HasValue ? lastDate.Value.ToString("yyyy-MM-dd") : "")}";
    }

    /// <summary>Hashes to fit the 64-char unique DedupeKey column. Posts with a source id key on that id, so two
    /// genuinely different adverts that share a title/org/deadline don't collide on the unique index; only
    /// id-less posts fall back to the (AI-wording-sensitive) title|org|deadline fingerprint.</summary>
    private static string ComputeDedupeKey(string? sourcePostKey, string rawFingerprint)
    {
        var basis = sourcePostKey is not null ? $"post:{sourcePostKey}" : rawFingerprint;
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(basis));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static readonly Regex AdvtNoPattern = new(@"Advt No:\s*([^\s|]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>The source's own id for the post: the agent-supplied SourcePostId, else the "Advt No: X"
    /// the agent writes at the start of RawContent. Lowercased with whitespace removed; null when neither
    /// is present (dedupe then falls back to DedupeKey alone). The AddJobDraftSourcePostKey migration's
    /// backfill SQL mirrors the RawContent parse — keep the two in step.</summary>
    private static string? BuildSourcePostKey(string? sourcePostId, string? rawContent)
    {
        var id = sourcePostId;
        if (string.IsNullOrWhiteSpace(id) && rawContent is not null)
        {
            var m = AdvtNoPattern.Match(rawContent);
            if (m.Success) id = m.Groups[1].Value.TrimEnd(',', ';', '.');
        }
        if (string.IsNullOrWhiteSpace(id)) return null;

        var key = Regex.Replace(id, @"\s+", "").ToLowerInvariant();
        return key.Length > 200 ? key[..200] : key;
    }

    private static string OutcomeFor(JobDraftQueue existing) =>
        existing.IsActive && existing.Status == JobDraftStatus.Pending
            ? JobDraftIngestOutcome.SkippedPending
            // Approved, Rejected, or removed from the queue — the admin has already dealt with it.
            : JobDraftIngestOutcome.SkippedReviewed;

    /// <summary>Includes hidden (IsActive=false) rows on purpose — a removed post must still count as known.</summary>
    private async Task<JobDraftQueue?> FindExistingAsync(string? sourcePostKey, string dedupeKey)
    {
        var rows = _db.JobDraftQueues.AsNoTracking().Include(x => x.SuggestedCategory);
        if (sourcePostKey is not null)
        {
            var byKey = await rows.FirstOrDefaultAsync(d => d.SourcePostKey == sourcePostKey);
            if (byKey is not null) return byKey;
        }
        return await rows.FirstOrDefaultAsync(d => d.DedupeKey == dedupeKey);
    }

    private static JobDraftQueueListItemDto ToListItemDto(JobDraftQueue d) => new()
    {
        Id = d.Id,
        SourceName = d.SourceName,
        SourceUrl = d.SourceUrl,
        Title = d.Title,
        OrganizationName = d.OrganizationName,
        TotalPosts = d.TotalPosts,
        LastDate = d.LastDate,
        ShortDescription = d.ShortDescription,
        SuggestedCategoryId = d.SuggestedCategoryId,
        SuggestedCategoryName = d.SuggestedCategory?.Name,
        State = d.State,
        Status = d.Status,
        CreatedDate = d.CreatedDate,
    };

    private static JobDraftQueueDto ToDto(JobDraftQueue d) => new()
    {
        Id = d.Id,
        SourceName = d.SourceName,
        SourceUrl = d.SourceUrl,
        Title = d.Title,
        OrganizationName = d.OrganizationName,
        TotalPosts = d.TotalPosts,
        LastDate = d.LastDate,
        ShortDescription = d.ShortDescription,
        SuggestedCategoryId = d.SuggestedCategoryId,
        SuggestedCategoryName = d.SuggestedCategory?.Name,
        State = d.State,
        Status = d.Status,
        CreatedDate = d.CreatedDate,
        FeedSourceId = d.FeedSourceId,
        NotificationDate = d.NotificationDate,
        RawContent = d.RawContent,
        CreatedJobId = d.CreatedJobId,
        ReviewedById = d.ReviewedById,
        ReviewedAt = d.ReviewedAt,
        ReviewNotes = d.ReviewNotes,
    };

    public async Task<PagedResult<JobDraftQueueListItemDto>> SearchAsync(int? status, int page = 1, int pageSize = 20)
    {
        // IsActive=false rows were "removed from queue" — hidden, but kept so re-scrapes still match them.
        var q = _db.JobDraftQueues.AsNoTracking().Include(d => d.SuggestedCategory).Where(d => d.IsActive);
        if (status.HasValue) q = q.Where(d => d.Status == status.Value);
        q = q.OrderByDescending(d => d.CreatedDate);

        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).Select(d => ToListItemDto(d)).ToListAsync();
        return new PagedResult<JobDraftQueueListItemDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total };
    }

    public async Task<JobDraftQueueDto?> GetByIdAsync(int id)
    {
        var d = await _db.JobDraftQueues.AsNoTracking().Include(x => x.SuggestedCategory)
            .FirstOrDefaultAsync(x => x.Id == id);
        return d is null ? null : ToDto(d);
    }

    public async Task<ServiceResult<JobDraftIngestResultDto>> IngestAsync(CreateJobDraftRequest request)
    {
        var sourcePostKey = BuildSourcePostKey(request.SourcePostId, request.RawContent);
        var rawFingerprint = BuildRawFingerprint(request.Title, request.OrganizationName, request.LastDate);
        var dedupeKey = ComputeDedupeKey(sourcePostKey, rawFingerprint);

        // Known post (pending, reviewed, or removed) → skip; the existing row's status is never touched.
        var existing = await FindExistingAsync(sourcePostKey, dedupeKey);
        if (existing is not null)
            return ServiceResult<JobDraftIngestResultDto>.Ok(new() { Outcome = OutcomeFor(existing), Draft = ToDto(existing) });

        // Same posting already live via some other path (e.g. manual mobile-post) with no queue row —
        // nothing left to review.
        var alreadyPublished = await _db.Jobs.AsNoTracking().AnyAsync(j => j.DuplicateFingerprint == rawFingerprint);
        if (alreadyPublished)
            return ServiceResult<JobDraftIngestResultDto>.Ok(new() { Outcome = JobDraftIngestOutcome.SkippedPublished });

        var entity = new JobDraftQueue
        {
            FeedSourceId = request.FeedSourceId,
            SourceName = request.SourceName.Trim(),
            SourceUrl = request.SourceUrl,
            DedupeKey = dedupeKey,
            SourcePostKey = sourcePostKey,
            Title = request.Title.Trim(),
            OrganizationName = request.OrganizationName,
            TotalPosts = request.TotalPosts,
            LastDate = request.LastDate,
            NotificationDate = request.NotificationDate,
            ShortDescription = request.ShortDescription,
            RawContent = request.RawContent,
            SuggestedCategoryId = request.SuggestedCategoryId,
            State = request.State,
            Status = JobDraftStatus.Pending,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };

        _db.JobDraftQueues.Add(entity);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Lost a race with a concurrent ingest of the same post — the unique indexes on
            // SourcePostKey/DedupeKey rejected our insert, so report the row that won.
            _db.Entry(entity).State = EntityState.Detached;
            var raced = await FindExistingAsync(sourcePostKey, dedupeKey);
            if (raced is null) throw;
            return ServiceResult<JobDraftIngestResultDto>.Ok(new() { Outcome = OutcomeFor(raced), Draft = ToDto(raced) });
        }

        return ServiceResult<JobDraftIngestResultDto>.Ok(new()
        {
            Outcome = JobDraftIngestOutcome.Created,
            Draft = (await GetByIdAsync(entity.Id))!,
        });
    }

    public async Task<ServiceResult<JobDto>> ApproveAsync(int id, AiImportJobRequest request, string userId)
    {
        var draft = await _db.JobDraftQueues.FindAsync(id);
        if (draft is null || !draft.IsActive) return ServiceResult<JobDto>.Fail("NotFound", "Draft not found.");
        if (draft.Status != JobDraftStatus.Pending)
            return ServiceResult<JobDto>.Fail("AlreadyReviewed", "This draft has already been reviewed.");

        var result = await _jobService.CreateFromAiImportAsync(request, userId);
        if (!result.Succeeded) return result;

        draft.Status = JobDraftStatus.Approved;
        draft.CreatedJobId = result.Data!.Id;
        draft.ReviewedById = userId;
        draft.ReviewedAt = DateTime.UtcNow;
        draft.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return result;
    }

    public async Task<ServiceResult> RejectAsync(int id, RejectJobDraftRequest request, string userId)
    {
        var draft = await _db.JobDraftQueues.FindAsync(id);
        if (draft is null || !draft.IsActive) return ServiceResult.Fail("NotFound", "Draft not found.");
        if (draft.Status != JobDraftStatus.Pending)
            return ServiceResult.Fail("AlreadyReviewed", "This draft has already been reviewed.");

        draft.Status = JobDraftStatus.Rejected;
        draft.ReviewNotes = request.ReviewNotes;
        draft.ReviewedById = userId;
        draft.ReviewedAt = DateTime.UtcNow;
        draft.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var draft = await _db.JobDraftQueues.FindAsync(id);
        if (draft is null || !draft.IsActive) return ServiceResult.Fail("NotFound", "Draft not found.");

        // Hide, don't delete: the row is what stops the next sync from re-importing this post as new.
        draft.IsActive = false;
        draft.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
