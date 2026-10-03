using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Social;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <summary>Turns a newly published post into per-channel <see cref="SocialShareJob"/> rows. Only DB inserts happen
/// here — posting to Telegram/Meta is done later by the background worker, so publishing never waits on them.</summary>
public class SocialShareService : ISocialShareService
{
    private readonly AppDbContext _db;
    private readonly SocialShareOptions _options;
    private readonly ILogger<SocialShareService> _logger;
    private readonly TimeProvider _clock;

    private DateTime Now => _clock.GetUtcNow().UtcDateTime;

    public SocialShareService(AppDbContext db, SocialShareOptions options, ILogger<SocialShareService> logger, TimeProvider? clock = null)
    {
        _db = db;
        _options = options;
        _logger = logger;
        _clock = clock ?? TimeProvider.System;
    }

    /// <summary>Server defaults for a category with no saved settings row.</summary>
    public static SocialShareSetting DefaultSetting(string category) => new()
    {
        Category = category,
        TelegramEnabled = true,
        InstagramEnabled = true,
        FacebookEnabled = true,
        RequireApproval = true,
        ImageSize = "square",
    };

    public async Task EnqueueAsync(string category, int entityId, bool skip = false, string? userId = null)
    {
        if (skip || !SocialShareCategories.IsValid(category)) return;
        try
        {
            await QueueAsync(category, entityId, userId, trigger: "publish", honorApproval: true, newGeneration: false);
        }
        catch (Exception ex)
        {
            // A sharing problem must never fail or roll back the publish that triggered it.
            _logger.LogError(ex, "Could not queue social shares for {Category} #{Id}.", category, entityId);
        }
    }

    public async Task<ServiceResult<int>> ShareAgainAsync(string category, int entityId, string userId)
    {
        if (!SocialShareCategories.IsValid(category))
            return ServiceResult<int>.Fail("InvalidCategory", "Unknown category.");
        try
        {
            var queued = await QueueAsync(category, entityId, userId, trigger: "manual", honorApproval: false, newGeneration: true);
            if (queued is null) return ServiceResult<int>.Fail("NotFound", "That post doesn't exist or isn't published.");
            if (queued == 0) return ServiceResult<int>.Fail("NothingToShare", "No channel is enabled for this category, or a share is already in progress.");
            return ServiceResult<int>.Ok(queued.Value);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "Share-again race for {Category} #{Id}.", category, entityId);
            return ServiceResult<int>.Fail("InProgress", "A share for this post was just queued. Check the Activity Log.");
        }
    }

    /// <summary>Returns null when the post isn't found/live, otherwise how many new share rows were created.</summary>
    private async Task<int?> QueueAsync(string category, int entityId, string? userId, string trigger, bool honorApproval, bool newGeneration)
    {
        var post = await LoadPostAsync(category, entityId);
        if (post is null) return null;

        var setting = await _db.SocialShareSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Category == category)
                      ?? DefaultSetting(category);

        var existing = await _db.SocialShareJobs
            .Where(j => j.Category == category && j.EntityId == entityId)
            .Select(j => new { j.Channel, j.Generation, j.Status })
            .ToListAsync();

        var detailsJson = JsonSerializer.Serialize(post.Details);
        var now = Now;
        var created = 0;

        foreach (var channel in SocialChannels.All)
        {
            if (!IsEnabled(setting, channel)) continue;

            var forChannel = existing.Where(e => e.Channel == channel).ToList();
            int generation;
            if (newGeneration)
            {
                // Don't stack a second share on top of one that hasn't finished.
                if (forChannel.Any(e => e.Status is SocialShareStatus.AwaitingApproval or SocialShareStatus.Pending or SocialShareStatus.Processing))
                    continue;
                generation = forChannel.Count == 0 ? 0 : forChannel.Max(e => e.Generation) + 1;
            }
            else
            {
                // Idempotency: a post is auto-shared once per channel, no matter how often it's edited,
                // unpublished or republished.
                if (forChannel.Count > 0) continue;
                generation = 0;
            }

            var configured = _options.IsConfigured(channel);
            _db.SocialShareJobs.Add(new SocialShareJob
            {
                Category = category,
                EntityId = entityId,
                Channel = channel,
                Generation = generation,
                Status = !configured ? SocialShareStatus.Skipped
                       : honorApproval && setting.RequireApproval ? SocialShareStatus.AwaitingApproval
                       : SocialShareStatus.Pending,
                NextAttemptAt = configured && !(honorApproval && setting.RequireApproval) ? now : null,
                Title = post.Title,
                Url = post.Url,
                DetailsJson = detailsJson,
                Error = configured ? null : $"{channel} isn't configured on the server (missing environment variables).",
                Trigger = trigger,
                RequestedById = userId,
                CreatedDate = now,
                UpdatedDate = now,
            });
            created++;
        }

        if (created > 0) await _db.SaveChangesAsync();
        return created;
    }


    // ---- Admin actions -----------------------------------------------------------------------------

    public async Task<ServiceResult> ApproveAsync(int shareId, string? message, string userId)
    {
        var job = await _db.SocialShareJobs.FindAsync(shareId);
        if (job is null) return ServiceResult.Fail("NotFound", "Share not found.");
        if (job.Status != SocialShareStatus.AwaitingApproval)
            return ServiceResult.Fail("NotAwaitingApproval", "Only a share that is waiting for approval can be approved.");

        if (!string.IsNullOrWhiteSpace(message))
        {
            var text = message.Trim();
            var limit = job.Channel == SocialChannels.Instagram ? CaptionBuilder.InstagramLimit : TelegramMessageRenderer.MessageLimit;
            if (text.Length > limit) return ServiceResult.Fail("TooLong", $"The {job.Channel} message can be at most {limit} characters.");
            job.Message = text;
        }

        job.Status = SocialShareStatus.Pending;
        job.NextAttemptAt = Now;
        job.RequestedById ??= userId;
        job.UpdatedDate = Now;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> RejectAsync(int shareId, string userId)
    {
        var job = await _db.SocialShareJobs.FindAsync(shareId);
        if (job is null) return ServiceResult.Fail("NotFound", "Share not found.");
        if (job.Status != SocialShareStatus.AwaitingApproval)
            return ServiceResult.Fail("NotAwaitingApproval", "Only a share that is waiting for approval can be rejected.");

        job.Status = SocialShareStatus.Skipped;
        job.NextAttemptAt = null;
        job.Error = "Rejected by an admin.";
        job.UpdatedDate = Now;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> RetryAsync(int shareId, string userId)
    {
        var job = await _db.SocialShareJobs.FindAsync(shareId);
        if (job is null) return ServiceResult.Fail("NotFound", "Share not found.");
        if (job.Status != SocialShareStatus.Failed)
            return ServiceResult.Fail("NotFailed", "Only a failed share can be retried.");
        if (!string.IsNullOrEmpty(job.ExternalId))
            return ServiceResult.Fail("AlreadyPosted", "This share was already posted.");

        job.Status = SocialShareStatus.Pending;
        job.Attempts = 0;
        job.NextAttemptAt = Now;
        job.Error = null;
        job.UpdatedDate = Now;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> RegenerateAsync(int shareId)
    {
        var job = await _db.SocialShareJobs.FindAsync(shareId);
        if (job is null) return ServiceResult.Fail("NotFound", "Share not found.");
        if (job.Status != SocialShareStatus.AwaitingApproval)
            return ServiceResult.Fail("NotAwaitingApproval", "Only a share that is waiting for approval can be regenerated.");

        var siblings = await _db.SocialShareJobs
            .Where(j => j.Category == job.Category && j.EntityId == job.EntityId && j.Generation == job.Generation
                        && j.Status == SocialShareStatus.AwaitingApproval)
            .ToListAsync();
        foreach (var s in siblings)
        {
            s.ImageUrl = null;
            s.Message = null;
            s.UpdatedDate = Now;
        }
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // ---- Settings & activity log -------------------------------------------------------------------

    private static readonly System.Text.RegularExpressions.Regex HexColor = new(@"^#[0-9a-fA-F]{6}$", System.Text.RegularExpressions.RegexOptions.Compiled);
    private static readonly System.Text.RegularExpressions.Regex TagName = new(@"</?\s*([a-zA-Z][a-zA-Z0-9-]*)", System.Text.RegularExpressions.RegexOptions.Compiled);
    private static readonly HashSet<string> TelegramTags = new(StringComparer.OrdinalIgnoreCase)
        { "b", "strong", "i", "em", "u", "ins", "s", "strike", "del", "a", "code", "pre", "tg-spoiler" };

    private static readonly Dictionary<string, string[]> PlaceholdersByCategory = new()
    {
        [ContentCategories.Job] = new[] { "title", "url", "organization", "vacancies", "qualification", "last_date", "location" },
        [ContentCategories.Result] = new[] { "title", "url", "organization", "exam", "result_date", "cut_off" },
        [ContentCategories.AdmitCard] = new[] { "title", "url", "organization", "exam", "released", "exam_date" },
        [ContentCategories.Scheme] = new[] { "title", "url", "ministry", "benefits", "eligibility" },
        [ContentCategories.News] = new[] { "title", "url", "summary", "source", "date" },
    };

    private static SocialShareSettingDto ToDto(SocialShareSetting s, bool saved) => new()
    {
        Category = s.Category,
        TelegramEnabled = s.TelegramEnabled, InstagramEnabled = s.InstagramEnabled, FacebookEnabled = s.FacebookEnabled,
        RequireApproval = s.RequireApproval,
        TelegramTemplate = s.TelegramTemplate, CaptionTemplate = s.CaptionTemplate, Hashtags = s.Hashtags,
        ImageStyle = s.ImageStyle, ImageSize = s.ImageSize, BrandColor = s.BrandColor, AccentColor = s.AccentColor, LogoUrl = s.LogoUrl,
        UpdatedDate = saved ? s.UpdatedDate : null,
        DefaultTelegramTemplate = TelegramMessageRenderer.DefaultTemplate(s.Category),
        DefaultCaptionTemplate = CaptionBuilder.DefaultTemplate(s.Category),
        DefaultHashtags = string.Join(' ', CaptionBuilder.DefaultHashtags(s.Category).Select(t => "#" + t)),
        Placeholders = PlaceholdersByCategory[s.Category].ToList(),
    };

    public async Task<List<SocialShareSettingDto>> GetSettingsAsync()
    {
        var rows = await _db.SocialShareSettings.AsNoTracking().ToListAsync();
        return SocialShareCategories.All
            .Select(c => rows.FirstOrDefault(r => r.Category == c) is { } row ? ToDto(row, true) : ToDto(DefaultSetting(c), false))
            .ToList();
    }

    public async Task<ServiceResult<SocialShareSettingDto>> UpdateSettingAsync(string category, UpdateSocialShareSettingRequest r)
    {
        if (!SocialShareCategories.IsValid(category))
            return ServiceResult<SocialShareSettingDto>.Fail("InvalidCategory", "Unknown category.");

        static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        var size = Clean(r.ImageSize)?.ToLowerInvariant() ?? "square";
        if (size is not ("square" or "portrait"))
            return ServiceResult<SocialShareSettingDto>.Fail("InvalidImageSize", "Image size must be 'square' or 'portrait'.");

        var brand = Clean(r.BrandColor);
        var accent = Clean(r.AccentColor);
        if ((brand is not null && !HexColor.IsMatch(brand)) || (accent is not null && !HexColor.IsMatch(accent)))
            return ServiceResult<SocialShareSettingDto>.Fail("InvalidColor", "Colours must look like #1D4ED8.");

        var logo = Clean(r.LogoUrl);
        if (logo is not null && !(logo.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || logo.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || logo.StartsWith('/')))
            return ServiceResult<SocialShareSettingDto>.Fail("InvalidLogo", "Logo must be an http(s) URL or a site path like /uploads/logo.png.");

        var telegram = Clean(r.TelegramTemplate);
        if (telegram is not null)
        {
            var bad = TagName.Matches(telegram).Select(m => m.Groups[1].Value).FirstOrDefault(t => !TelegramTags.Contains(t));
            if (bad is not null)
                return ServiceResult<SocialShareSettingDto>.Fail("InvalidTemplate", $"Telegram does not support the <{bad}> tag. Use b, i, u, s, a, code or pre.");
        }

        var row = await _db.SocialShareSettings.FindAsync(category);
        if (row is null)
        {
            row = new SocialShareSetting { Category = category };
            _db.SocialShareSettings.Add(row);
        }

        row.TelegramEnabled = r.TelegramEnabled;
        row.InstagramEnabled = r.InstagramEnabled;
        row.FacebookEnabled = r.FacebookEnabled;
        row.RequireApproval = r.RequireApproval;
        row.TelegramTemplate = telegram;
        row.CaptionTemplate = Clean(r.CaptionTemplate);
        row.Hashtags = Clean(r.Hashtags);
        row.ImageStyle = Clean(r.ImageStyle) is { } style ? SocialText.Clean(style, 500) : null;
        row.ImageSize = size;
        row.BrandColor = brand;
        row.AccentColor = accent;
        row.LogoUrl = logo;
        row.UpdatedDate = Now;
        await _db.SaveChangesAsync();
        return ServiceResult<SocialShareSettingDto>.Ok(ToDto(row, true));
    }

    public async Task<PagedResult<SocialShareJobDto>> SearchAsync(int? status, string? category, string? channel, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.SocialShareJobs.AsNoTracking().AsQueryable();
        if (status.HasValue) q = q.Where(j => j.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(j => j.Category == category);
        if (!string.IsNullOrWhiteSpace(channel)) q = q.Where(j => j.Channel == channel);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(j => j.UpdatedDate).ThenByDescending(j => j.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(j => new SocialShareJobDto
            {
                Id = j.Id, Category = j.Category, EntityId = j.EntityId, Channel = j.Channel, Generation = j.Generation,
                Status = j.Status, Attempts = j.Attempts, NextAttemptAt = j.NextAttemptAt, Title = j.Title, Url = j.Url,
                ImageUrl = j.ImageUrl, Message = j.Message, ExternalId = j.ExternalId, Error = j.Error, Trigger = j.Trigger,
                CreatedDate = j.CreatedDate, UpdatedDate = j.UpdatedDate, PostedAt = j.PostedAt,
            }).ToListAsync();
        return new PagedResult<SocialShareJobDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total };
    }

    public async Task<SocialShareSummaryDto> GetSummaryAsync()
    {
        var counts = await _db.SocialShareJobs.AsNoTracking().GroupBy(j => j.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync();
        int Of(params int[] statuses) => counts.Where(c => statuses.Contains(c.Status)).Sum(c => c.Count);
        return new SocialShareSummaryDto
        {
            AwaitingApproval = Of(SocialShareStatus.AwaitingApproval),
            Queued = Of(SocialShareStatus.Pending, SocialShareStatus.Processing),
            Posted = Of(SocialShareStatus.Posted),
            Failed = Of(SocialShareStatus.Failed),
            Skipped = Of(SocialShareStatus.Skipped),
        };
    }
    private static bool IsEnabled(SocialShareSetting s, string channel) => channel switch
    {
        SocialChannels.Telegram => s.TelegramEnabled,
        SocialChannels.Instagram => s.InstagramEnabled,
        SocialChannels.Facebook => s.FacebookEnabled,
        _ => false,
    };


    private sealed record PostFacts(string Title, string Url, List<SocialDetail> Details);

    private static string PathFor(string category) => category switch
    {
        ContentCategories.Job => "jobs",
        ContentCategories.Result => "results",
        ContentCategories.AdmitCard => "admit-cards",
        ContentCategories.Scheme => "schemes",
        _ => "news",
    };

    /// <summary>Reads the live post and builds its sanitized title, public URL and key-detail lines.</summary>
    private async Task<PostFacts?> LoadPostAsync(string category, int id)
    {
        string title, slug;
        var d = new List<SocialDetail>();
        void Add(string label, string? value, int max = 120)
        {
            var v = SocialText.Clean(value, max);
            if (v.Length > 0) d.Add(new SocialDetail(label, v));
        }

        switch (category)
        {
            case ContentCategories.Job:
            {
                var e = await _db.Jobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
                if (e is null) return null;
                title = e.Title; slug = e.Slug;
                Add("Organization", e.OrganizationName);
                Add("Vacancies", e.TotalPosts?.ToString());
                Add("Qualification", e.QualificationRequired);
                Add("Last date", SocialText.Date(e.LastDate));
                Add("Location", e.Location ?? e.State, 60);
                break;
            }
            case ContentCategories.Result:
            {
                var e = await _db.Results.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
                if (e is null) return null;
                title = e.Title; slug = e.Slug;
                Add("Organization", e.OrganizationName);
                Add("Exam", e.ExamName);
                Add("Result date", SocialText.Date(e.ResultDate));
                Add("Cut-off", e.CutOffMarks, 80);
                break;
            }
            case ContentCategories.AdmitCard:
            {
                var e = await _db.AdmitCards.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
                if (e is null) return null;
                title = e.Title; slug = e.Slug;
                Add("Organization", e.OrganizationName);
                Add("Exam", e.ExamName ?? e.PostName);
                Add("Released", SocialText.Date(e.AdmitCardReleaseDate));
                Add("Exam date", SocialText.Date(e.ExamDate));
                break;
            }
            case ContentCategories.Scheme:
            {
                var e = await _db.GovtSchemes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
                if (e is null) return null;
                title = e.Title; slug = e.Slug;
                Add("Ministry", e.Ministry);
                Add("Benefits", e.Benefits, 140);
                Add("Eligibility", e.Eligibility, 140);
                break;
            }
            default:
            {
                var e = await _db.News.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
                if (e is null) return null;
                title = e.Title; slug = e.Slug;
                Add("Summary", e.Summary, 200);
                Add("Source", e.Source, 60);
                Add("Date", SocialText.Date(e.PublishedDate));
                break;
            }
        }

        var cleanTitle = SocialText.Clean(title, 200);
        if (cleanTitle.Length == 0 || string.IsNullOrWhiteSpace(slug)) return null;
        var url = $"{_options.PublicBaseUrl}/{PathFor(category)}/{Uri.EscapeDataString(slug)}";
        return new PostFacts(cleanTitle, url, d);
    }
}
