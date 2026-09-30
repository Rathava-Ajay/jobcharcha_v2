using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobPortal.Infrastructure.Services;

public class JobService : IJobService
{
    private readonly AppDbContext _db;
    private readonly IBackgroundTaskQueue _taskQueue;

    public JobService(AppDbContext db, IBackgroundTaskQueue taskQueue)
    {
        _db = db;
        _taskQueue = taskQueue;
    }

    /// <summary>
    /// Normalized "title|organization|deadline" fingerprint used to detect duplicate postings
    /// (e.g. the same notification re-imported twice, or posted once manually and once via AI import).
    /// </summary>
    private static string BuildFingerprint(string title, string organizationName, DateTime lastDate)
    {
        static string Normalize(string s) =>
            System.Text.RegularExpressions.Regex.Replace(s.Trim().ToLowerInvariant(), @"\s+", " ");
        return $"{Normalize(title)}|{Normalize(organizationName)}|{lastDate:yyyy-MM-dd}";
    }

    private async Task<bool> FingerprintExistsAsync(string fingerprint, int? excludeId = null)
    {
        var q = _db.Jobs.Where(j => j.DuplicateFingerprint == fingerprint);
        if (excludeId.HasValue) q = q.Where(j => j.Id != excludeId.Value);
        return await q.AnyAsync();
    }

    private void EnqueueAlertDispatch(int jobId)
    {
        _taskQueue.QueueBackgroundWorkItem(async (sp, ct) =>
        {
            var dispatchService = sp.GetRequiredService<IJobAlertDispatchService>();
            await dispatchService.DispatchForNewJobAsync(jobId);
        });
    }

    public async Task<PagedResult<JobListItemDto>> SearchAsync(JobQuery query, bool includeInactive = false)
    {
        var q = _db.Jobs.AsNoTracking().Include(j => j.Category).AsQueryable();
        if (!includeInactive) q = q.Where(j => j.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            q = q.Where(j => j.Title.Contains(term) || j.OrganizationName.Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(query.Category) && query.Category != "All")
            q = q.Where(j => j.Category.Name == query.Category || j.Category.Slug == query.Category);
        if (!string.IsNullOrWhiteSpace(query.Location) && query.Location != "All India / Central")
            q = q.Where(j => j.Location != null && j.Location.Contains(query.Location) ||
                              j.District != null && j.District.Contains(query.Location) ||
                              j.State != null && j.State.Contains(query.Location));
        if (!string.IsNullOrWhiteSpace(query.Qualification) && query.Qualification != "All Qualifications")
            q = q.Where(j => j.QualificationRequired != null && j.QualificationRequired.Contains(query.Qualification));
        if (query.MinSalary.HasValue)
            q = q.Where(j => j.MaxSalary == null || j.MaxSalary >= query.MinSalary);
        if (query.MaxSalary.HasValue)
            q = q.Where(j => j.MinSalary == null || j.MinSalary <= query.MaxSalary);
        if (query.FeaturedOnly == true)
            q = q.Where(j => j.IsFeatured);

        var totalCount = await q.CountAsync();

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var items = await q
            .OrderByDescending(j => j.IsFeatured)
            .ThenByDescending(j => j.PostedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<JobListItemDto>
        {
            Items = items.Select(ToListItemDto).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
        };
    }

    public async Task<List<JobListItemDto>> GetLatestAsync(int count = 10)
    {
        var items = await _db.Jobs.AsNoTracking().Include(j => j.Category)
            .Where(j => j.IsActive)
            .OrderByDescending(j => j.PostedDate)
            .Take(count)
            .ToListAsync();
        return items.Select(ToListItemDto).ToList();
    }

    public async Task<List<JobListItemDto>> GetTrendingAsync(int count = 10)
    {
        var items = await _db.Jobs.AsNoTracking().Include(j => j.Category)
            .Where(j => j.IsActive)
            .OrderByDescending(j => j.Views)
            .Take(count)
            .ToListAsync();
        return items.Select(ToListItemDto).ToList();
    }

    public async Task<JobDto?> GetBySlugAsync(string slug)
    {
        var job = await _db.Jobs.AsNoTracking().Include(j => j.Category)
            .FirstOrDefaultAsync(j => j.Slug == slug && j.IsActive);
        if (job is null) return null;

        await _db.Jobs.Where(j => j.Id == job.Id).ExecuteUpdateAsync(s => s.SetProperty(j => j.Views, j => j.Views + 1));
        job.Views += 1;

        var dto = ToFullDto(job);
        dto.SimilarJobs = (await _db.Jobs.AsNoTracking().Include(j => j.Category)
                .Where(j => j.IsActive && j.CategoryId == job.CategoryId && j.Id != job.Id)
                .OrderByDescending(j => j.PostedDate)
                .Take(4)
                .ToListAsync())
            .Select(ToFullDto).ToList();

        return dto;
    }

    public async Task<JobDto?> GetByIdAsync(int id)
    {
        var job = await _db.Jobs.AsNoTracking().Include(j => j.Category).FirstOrDefaultAsync(j => j.Id == id);
        return job is null ? null : ToFullDto(job);
    }

    public async Task<ServiceResult<JobDto>> CreateAsync(UpsertJobRequest request, string userId)
    {
        var categoryExists = await _db.Categories.AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists) return ServiceResult<JobDto>.Fail("InvalidCategory", "Category does not exist.");

        var fingerprint = BuildFingerprint(request.Title, request.OrganizationName, request.LastDate);
        if (await FingerprintExistsAsync(fingerprint))
            return ServiceResult<JobDto>.Fail("Duplicate", "A job with the same title, organization, and last date already exists.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        var uniqueSlug = await EnsureUniqueSlugAsync(slug, null);

        var entity = new Job
        {
            Title = request.Title,
            Slug = uniqueSlug,
            OrganizationName = request.OrganizationName,
            DuplicateFingerprint = fingerprint,
            CategoryId = request.CategoryId,
            Location = request.Location,
            District = request.District,
            State = request.State,
            TotalPosts = request.TotalPosts,
            Salary = request.Salary,
            QualificationRequired = request.QualificationRequired,
            PostedDate = request.PostedDate,
            LastDate = request.LastDate,
            ApplicationLink = request.ApplicationLink,
            IsFeatured = request.IsFeatured,
            IsUrgent = request.IsUrgent,
            IsNew = request.IsNew,
            ShortDescription = request.ShortDescription,
            FullDescription = request.FullDescription,
            DetailedEligibility = request.DetailedEligibility,
            HowToApply = request.HowToApply,
            SelectionProcess = request.SelectionProcess,
            OfficialNotificationPdf = request.OfficialNotificationPdf,
            NotificationFileName = request.NotificationFileName,
            SyllabusPdf = request.SyllabusPdf,
            OrganizationLogo = request.OrganizationLogo,
            Status = request.Status,
            IsActive = request.IsActive,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,
            ApplicationClicks = 0,
        };
        _db.Jobs.Add(entity);
        await _db.SaveChangesAsync();
        if (entity.IsActive) EnqueueAlertDispatch(entity.Id);

        var saved = await _db.Jobs.Include(j => j.Category).FirstAsync(j => j.Id == entity.Id);
        return ServiceResult<JobDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<JobDto>> CreateFromAiImportAsync(AiImportJobRequest request, string userId)
    {
        var categoryExists = await _db.Categories.AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists) return ServiceResult<JobDto>.Fail("InvalidCategory", "Category does not exist.");

        var fingerprint = BuildFingerprint(request.Title, request.Department, request.LastDate);
        if (await FingerprintExistsAsync(fingerprint))
            return ServiceResult<JobDto>.Fail("Duplicate", "A job with the same title, organization, and last date already exists.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        var uniqueSlug = await EnsureUniqueSlugAsync(slug, null);

        var eligibility = request.Qualification;
        if (!string.IsNullOrWhiteSpace(request.AgeLimit))
            eligibility = string.IsNullOrWhiteSpace(eligibility) ? $"Age Limit: {request.AgeLimit}" : $"{eligibility}\nAge Limit: {request.AgeLimit}";

        var entity = new Job
        {
            Title = request.Title,
            Slug = uniqueSlug,
            OrganizationName = request.Department,
            DuplicateFingerprint = fingerprint,
            CategoryId = request.CategoryId,
            Location = request.Location,
            State = NullIfBlank(request.State),
            District = NullIfBlank(request.District),
            TotalPosts = request.TotalPosts,
            Salary = request.Salary,
            MinSalary = request.MinSalary > 0 ? request.MinSalary : null,
            MaxSalary = request.MaxSalary > 0 ? request.MaxSalary : null,
            SalaryType = NullIfBlank(request.SalaryType),
            MinAge = request.MinAge > 0 ? request.MinAge : null,
            MaxAge = request.MaxAge > 0 ? request.MaxAge : null,
            ExperienceRequired = request.ExperienceRequired >= 0 ? request.ExperienceRequired : null,
            AdvertisementNumber = NullIfBlank(request.AdvertisementNumber),
            OfficialWebsite = NullIfBlank(request.OfficialWebsite),
            SyllabusPdf = NullIfBlank(request.SyllabusLink),
            ApplicationFee = request.ApplicationFeeAmount >= 0 ? request.ApplicationFeeAmount : null,
            ApplicationFeeDetails = NullIfBlank(request.ApplicationFeeDetails),
            QualificationRequired = request.Qualification,
            DetailedEligibility = !string.IsNullOrWhiteSpace(request.EligibilityDetails) ? request.EligibilityDetails : eligibility,
            PostedDate = DateTime.UtcNow,
            LastDate = request.LastDate,
            ApplicationLink = request.ApplyLink,
            OfficialNotificationPdf = request.OfficialNotificationPdf,
            NotificationFileName = request.NotificationFileName,
            ShortDescription = request.ShortDescription,
            FullDescription = request.Overview,
            KeyHighlights = request.KeyHighlights,
            HowToApply = request.HowToApply,
            ImportantNotes = request.ImportantNotes,
            DocumentsRequired = request.DocumentsRequired,
            SelectionProcess = request.SelectionProcess.Count > 0 ? string.Join("\n", request.SelectionProcess) : null,
            Status = request.AutoPublish ? 1 : 0,
            IsActive = request.AutoPublish,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
            Views = 0,
            ApplicationClicks = 0,

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
            VacancyBreakdownJson = request.VacancyBreakdown.Count > 0 ? JsonSerializer.Serialize(request.VacancyBreakdown) : null,
            CategoryWiseVacancyJson = request.CategoryWiseVacancy.Count > 0 ? JsonSerializer.Serialize(request.CategoryWiseVacancy) : null,
            SelectionProcessJson = request.SelectionProcess.Count > 0 ? JsonSerializer.Serialize(request.SelectionProcess) : null,
            ApplicationFeeJson = request.ApplicationFee.Count > 0 ? JsonSerializer.Serialize(request.ApplicationFee) : null,
            ExamPatternJson = request.ExamPattern.Count > 0 ? JsonSerializer.Serialize(request.ExamPattern) : null,
            SalaryBreakdownJson = request.SalaryBreakdown is not null ? JsonSerializer.Serialize(request.SalaryBreakdown) : null,
            ImportantDatesJson = request.ImportantDates is not null ? JsonSerializer.Serialize(request.ImportantDates) : null,

            NotificationDate = request.ImportantDates?.NotificationDate,
            StartDate = request.ImportantDates?.ApplicationStart,
            ExamDate = request.ImportantDates?.ExamDate,
        };
        _db.Jobs.Add(entity);
        await _db.SaveChangesAsync();
        if (entity.IsActive) EnqueueAlertDispatch(entity.Id);

        var saved = await _db.Jobs.Include(j => j.Category).FirstAsync(j => j.Id == entity.Id);
        return ServiceResult<JobDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult<JobDto>> UpdateAsync(int id, UpsertJobRequest request, string userId)
    {
        var entity = await _db.Jobs.FindAsync(id);
        if (entity is null) return ServiceResult<JobDto>.Fail("NotFound", "Job not found.");

        var categoryExists = await _db.Categories.AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists) return ServiceResult<JobDto>.Fail("InvalidCategory", "Category does not exist.");

        var fingerprint = BuildFingerprint(request.Title, request.OrganizationName, request.LastDate);
        if (await FingerprintExistsAsync(fingerprint, excludeId: id))
            return ServiceResult<JobDto>.Fail("Duplicate", "A job with the same title, organization, and last date already exists.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != entity.Slug)
            slug = await EnsureUniqueSlugAsync(slug, id);

        entity.Title = request.Title;
        entity.Slug = slug;
        entity.OrganizationName = request.OrganizationName;
        entity.DuplicateFingerprint = fingerprint;
        entity.CategoryId = request.CategoryId;
        entity.Location = request.Location;
        entity.District = request.District;
        entity.State = request.State;
        entity.TotalPosts = request.TotalPosts;
        entity.Salary = request.Salary;
        entity.QualificationRequired = request.QualificationRequired;
        entity.PostedDate = request.PostedDate;
        entity.LastDate = request.LastDate;
        entity.ApplicationLink = request.ApplicationLink;
        entity.IsFeatured = request.IsFeatured;
        entity.IsUrgent = request.IsUrgent;
        entity.IsNew = request.IsNew;
        entity.ShortDescription = request.ShortDescription;
        entity.FullDescription = request.FullDescription;
        entity.DetailedEligibility = request.DetailedEligibility;
        entity.HowToApply = request.HowToApply;
        entity.SelectionProcess = request.SelectionProcess;
        entity.OfficialNotificationPdf = request.OfficialNotificationPdf;
        entity.NotificationFileName = request.NotificationFileName;
        entity.SyllabusPdf = request.SyllabusPdf;
        entity.OrganizationLogo = request.OrganizationLogo;
        entity.Status = request.Status;
        entity.IsActive = request.IsActive;
        entity.UpdatedById = userId;
        entity.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var saved = await _db.Jobs.Include(j => j.Category).FirstAsync(j => j.Id == id);
        return ServiceResult<JobDto>.Ok(ToFullDto(saved));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.Jobs.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Job not found.");
        _db.Jobs.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> SetStatusAsync(int id, int status, string userId)
    {
        var entity = await _db.Jobs.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Job not found.");
        entity.Status = status;
        entity.UpdatedById = userId;
        entity.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> SetActiveAsync(int id, bool isActive, string userId)
    {
        var entity = await _db.Jobs.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Job not found.");
        var wasActive = entity.IsActive;
        entity.IsActive = isActive;
        entity.UpdatedById = userId;
        entity.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        if (isActive && !wasActive) EnqueueAlertDispatch(entity.Id);
        return ServiceResult.Ok();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Jobs.AnyAsync(j => j.Slug == slug && j.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant()
            .Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private static string ComputeStatus(Job job)
    {
        if (job.Status == 0) return "Draft";
        return job.LastDate.Date < DateTime.UtcNow.Date ? "Expired" : "Active";
    }

    private static List<string> BuildTags(Job job)
    {
        var tags = new List<string>();
        if (job.IsFeatured) tags.Add("Featured");
        if (job.IsUrgent) tags.Add("Urgent");
        if (job.IsNew) tags.Add("New");
        if (job.PostedDate >= DateTime.UtcNow.AddDays(-7)) tags.Add("Latest Vacancy");
        return tags;
    }

    private static JobListItemDto ToListItemDto(Job j) => new()
    {
        Id = j.Id,
        Title = j.Title,
        Slug = j.Slug,
        CompanyOrDept = j.OrganizationName,
        Category = j.Category.Name,
        Location = j.Location ?? j.District ?? j.State ?? "Pan India",
        VacancyCount = j.TotalPosts ?? 0,
        Salary = j.Salary ?? "As per norms",
        Qualification = j.QualificationRequired ?? "Graduate",
        Type = "public",
        LastDate = j.LastDate.ToString("yyyy-MM-dd"),
        PostedDate = j.PostedDate.ToString("yyyy-MM-dd"),
        IsFeatured = j.IsFeatured,
        IsUrgent = j.IsUrgent,
        IsNew = j.IsNew,
        Status = ComputeStatus(j),
        Tags = BuildTags(j),
        ViewsCount = j.Views,
    };

    private static JobDto ToFullDto(Job j) => new()
    {
        Id = j.Id,
        Title = j.Title,
        Slug = j.Slug,
        CompanyOrDept = j.OrganizationName,
        Category = j.Category.Name,
        CategoryId = j.CategoryId,
        Location = j.Location ?? j.District ?? j.State ?? "Pan India",
        District = j.District,
        State = j.State,
        VacancyCount = j.TotalPosts ?? 0,
        Salary = j.Salary ?? "As per norms",
        Qualification = j.QualificationRequired ?? "Graduate",
        Type = "public",
        LastDate = j.LastDate.ToString("yyyy-MM-dd"),
        PostedDate = j.PostedDate.ToString("yyyy-MM-dd"),
        IsBoosted = j.IsFeatured,
        IsFeatured = j.IsFeatured,
        IsUrgent = j.IsUrgent,
        IsNew = j.IsNew,
        Status = ComputeStatus(j),
        OfficialNotificationUrl = j.OfficialNotificationPdf,
        ApplyUrl = j.ApplicationLink,
        SyllabusLink = j.SyllabusPdf,
        OrganizationLogo = j.OrganizationLogo,
        Overview = j.FullDescription ?? j.ShortDescription,
        Eligibility = j.DetailedEligibility,
        DocumentsRequired = j.DocumentsRequired,
        ImportantDates = BuildImportantDates(j),
        HowToApply = j.HowToApply,
        SelectionProcess = j.SelectionProcess,
        Tags = BuildTags(j),
        ViewsCount = j.Views,
        ApplyClicksCount = j.ApplicationClicks,
        KeyHighlights = j.KeyHighlights,
        ImportantNotes = j.ImportantNotes,
        MinAge = j.MinAge,
        MaxAge = j.MaxAge,
        MinSalary = j.MinSalary,
        MaxSalary = j.MaxSalary,
        SalaryType = j.SalaryType,
        ExperienceRequired = j.ExperienceRequired,
        AdvertisementNumber = j.AdvertisementNumber,
        OfficialWebsite = j.OfficialWebsite,
        TelegramLink = j.TelegramLink,
        WhatsAppLink = j.WhatsAppLink,
        ApplicationFee = j.ApplicationFee,
        ApplicationFeeDetails = j.ApplicationFeeDetails,
        VacancyBreakdownJson = j.VacancyBreakdownJson,
        CategoryWiseVacancyJson = j.CategoryWiseVacancyJson,
        SelectionProcessJson = j.SelectionProcessJson,
        ApplicationFeeJson = j.ApplicationFeeJson,
        FocusKeyword = j.FocusKeyword,
        SecondaryKeywordsJson = j.SecondaryKeywordsJson,
        LsiKeywordsJson = j.LsiKeywordsJson,
        FaqSchemaJson = j.FaqSchemaJson,
        InternalLinkAnchorsJson = j.InternalLinkAnchorsJson,
        ExamPatternJson = j.ExamPatternJson,
        SalaryBreakdownJson = j.SalaryBreakdownJson,
        ImportantDatesJson = j.ImportantDatesJson,
        OgTitle = j.OgTitle,
        OgDescription = j.OgDescription,
        MetaTitle = j.MetaTitle,
        MetaDescription = j.MetaDescription,
        MetaKeywords = j.MetaKeywords,
    };

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<ImportantDateDto> BuildImportantDates(Job j)
    {
        var dates = new List<ImportantDateDto>();
        if (j.NotificationDate.HasValue) dates.Add(new ImportantDateDto { Label = "Notification Date", Date = j.NotificationDate.Value.ToString("yyyy-MM-dd") });
        if (j.StartDate.HasValue) dates.Add(new ImportantDateDto { Label = "Application Start", Date = j.StartDate.Value.ToString("yyyy-MM-dd") });

        // The richer AI-captured milestone set (application end, fee payment end, admit card date,
        // result date) has no corresponding scalar column — read it from the stored JSON instead.
        ImportantDatesRequest? extra = null;
        if (!string.IsNullOrWhiteSpace(j.ImportantDatesJson))
        {
            try { extra = JsonSerializer.Deserialize<ImportantDatesRequest>(j.ImportantDatesJson); }
            catch (JsonException) { /* malformed/legacy JSON — ignore, scalar-column dates still render */ }
        }

        // "Last Date to Apply" is always added below from j.LastDate — skip an identical Application End row.
        if (extra?.ApplicationEnd is not null && extra.ApplicationEnd.Value.Date != j.LastDate.Date) dates.Add(new ImportantDateDto { Label = "Application End", Date = extra.ApplicationEnd.Value.ToString("yyyy-MM-dd") });
        if (extra?.FeePaymentEnd is not null) dates.Add(new ImportantDateDto { Label = "Fee Payment Last Date", Date = extra.FeePaymentEnd.Value.ToString("yyyy-MM-dd") });
        dates.Add(new ImportantDateDto { Label = "Last Date to Apply", Date = j.LastDate.ToString("yyyy-MM-dd") });
        if (extra?.AdmitCardDate is not null) dates.Add(new ImportantDateDto { Label = "Admit Card Date", Date = extra.AdmitCardDate.Value.ToString("yyyy-MM-dd") });
        if (j.ExamDate.HasValue) dates.Add(new ImportantDateDto { Label = "Exam Date", Date = j.ExamDate.Value.ToString("yyyy-MM-dd") });
        if (j.InterviewDate.HasValue) dates.Add(new ImportantDateDto { Label = "Interview Date", Date = j.InterviewDate.Value.ToString("yyyy-MM-dd") });
        if (extra?.ResultDate is not null) dates.Add(new ImportantDateDto { Label = "Result Date", Date = extra.ResultDate.Value.ToString("yyyy-MM-dd") });
        foreach (var other in extra?.OtherDates ?? new())
        {
            if (!string.IsNullOrWhiteSpace(other.Label) && !string.IsNullOrWhiteSpace(other.Date))
                dates.Add(new ImportantDateDto { Label = other.Label.Trim(), Date = other.Date.Trim() });
        }
        return dates;
    }

    public async Task<BulkImportResult> BulkImportAsync(string csvContent, string userId)
    {
        var rows = CsvUtil.Parse(csvContent);
        var result = new BulkImportResult { TotalRows = rows.Count };

        for (var i = 0; i < rows.Count; i++)
        {
            var rowNumber = i + 2; // row 1 is the header
            try
            {
                var request = MapRowToUpsertJobRequest(rows[i]);
                var created = await CreateAsync(request, userId);
                if (created.Succeeded)
                {
                    result.SuccessCount++;
                }
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

    private static UpsertJobRequest MapRowToUpsertJobRequest(Dictionary<string, string> row)
    {
        string Get(string key) => row.TryGetValue(key, out var v) ? v.Trim() : "";
        string? GetOpt(string key) => string.IsNullOrWhiteSpace(Get(key)) ? null : Get(key);

        var title = Get("Title");
        if (string.IsNullOrWhiteSpace(title)) throw new FormatException("Title is required.");
        var organizationName = Get("OrganizationName");
        if (string.IsNullOrWhiteSpace(organizationName)) throw new FormatException("OrganizationName is required.");
        if (!int.TryParse(Get("CategoryId"), out var categoryId)) throw new FormatException("CategoryId must be a whole number.");
        if (!DateTime.TryParse(Get("LastDate"), out var lastDate)) throw new FormatException("LastDate must be a valid date (e.g. 2026-09-30).");

        var postedDateRaw = Get("PostedDate");
        var postedDate = string.IsNullOrWhiteSpace(postedDateRaw) ? DateTime.UtcNow
            : DateTime.TryParse(postedDateRaw, out var pd) ? pd
            : throw new FormatException("PostedDate must be a valid date if provided.");

        return new UpsertJobRequest
        {
            Title = title,
            Slug = GetOpt("Slug"),
            OrganizationName = organizationName,
            CategoryId = categoryId,
            Location = GetOpt("Location"),
            District = GetOpt("District"),
            State = GetOpt("State"),
            TotalPosts = int.TryParse(Get("TotalPosts"), out var totalPosts) ? totalPosts : null,
            Salary = GetOpt("Salary"),
            QualificationRequired = GetOpt("QualificationRequired"),
            PostedDate = postedDate,
            LastDate = lastDate,
            ApplicationLink = GetOpt("ApplicationLink"),
            IsFeatured = ParseBoolCell(Get("IsFeatured")),
            IsUrgent = ParseBoolCell(Get("IsUrgent")),
            IsNew = ParseBoolCell(Get("IsNew")),
            ShortDescription = GetOpt("ShortDescription"),
            FullDescription = GetOpt("FullDescription"),
            DetailedEligibility = GetOpt("DetailedEligibility"),
            HowToApply = GetOpt("HowToApply"),
            SelectionProcess = GetOpt("SelectionProcess"),
            OfficialNotificationPdf = GetOpt("OfficialNotificationPdf"),
            SyllabusPdf = GetOpt("SyllabusPdf"),
            OrganizationLogo = GetOpt("OrganizationLogo"),
            Status = int.TryParse(Get("Status"), out var status) ? status : 1,
            IsActive = string.IsNullOrWhiteSpace(Get("IsActive")) || ParseBoolCell(Get("IsActive")),
        };
    }

    private static bool ParseBoolCell(string value) =>
        value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1" || value.Equals("yes", StringComparison.OrdinalIgnoreCase);

    public async Task<string> ExportCsvAsync()
    {
        var jobs = await _db.Jobs.AsNoTracking().OrderByDescending(j => j.CreatedDate).ToListAsync();
        var headers = new[]
        {
            "Title", "Slug", "OrganizationName", "CategoryId", "Location", "District", "State", "TotalPosts",
            "Salary", "QualificationRequired", "PostedDate", "LastDate", "ApplicationLink", "IsFeatured",
            "IsUrgent", "IsNew", "ShortDescription", "FullDescription", "DetailedEligibility", "HowToApply",
            "SelectionProcess", "OfficialNotificationPdf", "SyllabusPdf", "OrganizationLogo", "Status", "IsActive",
        };
        var rows = jobs.Select(j => new List<string?>
        {
            j.Title, j.Slug, j.OrganizationName, j.CategoryId.ToString(), j.Location, j.District, j.State,
            j.TotalPosts?.ToString(), j.Salary, j.QualificationRequired, j.PostedDate.ToString("yyyy-MM-dd"),
            j.LastDate.ToString("yyyy-MM-dd"), j.ApplicationLink, j.IsFeatured.ToString(), j.IsUrgent.ToString(),
            j.IsNew.ToString(), j.ShortDescription, j.FullDescription, j.DetailedEligibility, j.HowToApply,
            j.SelectionProcess, j.OfficialNotificationPdf, j.SyllabusPdf, j.OrganizationLogo, j.Status.ToString(), j.IsActive.ToString(),
        });
        return CsvUtil.Write(headers, rows);
    }
}
