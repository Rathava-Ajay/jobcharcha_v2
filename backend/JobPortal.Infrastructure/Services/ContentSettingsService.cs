using System.ComponentModel.DataAnnotations;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Infrastructure.Services;

public class ContentSettingsService : IContentSettingsService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public ContentSettingsService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public static ContentCategorySettingDto Defaults(string category, IConfiguration config) => new()
    {
        Category = category,
        IsEnabled = true,
        MaxItemsPerRun = config.GetValue("ContentSync:MaxItemsPerRun", 10),
        FreshnessDays = config.GetValue("ContentSync:FreshnessDays", 7),
        ExtraInstructions = null,
        IsCustomized = false,
        AutoPublish = false,
        AutoPublishAllowed = ContentCategories.CanAutoPublish(category),
    };

    public static ContentCategorySettingDto ToDto(ContentCategorySetting s) => new()
    {
        Category = s.Category, IsEnabled = s.IsEnabled, MaxItemsPerRun = s.MaxItemsPerRun,
        FreshnessDays = s.FreshnessDays, ExtraInstructions = s.ExtraInstructions, IsCustomized = true,
        AutoPublish = s.AutoPublish && ContentCategories.CanAutoPublish(s.Category),
        AutoPublishAllowed = ContentCategories.CanAutoPublish(s.Category),
    };

    /// <summary>Merges saved rows over the defaults so callers always get one setting per category.</summary>
    public static List<ContentCategorySettingDto> Merge(IEnumerable<ContentCategorySetting> rows, IConfiguration config)
    {
        var byCategory = rows.ToDictionary(r => r.Category);
        return ContentCategories.All
            .Select(c => byCategory.TryGetValue(c, out var row) ? ToDto(row) : Defaults(c, config))
            .ToList();
    }

    public async Task<List<ContentCategorySettingDto>> GetAllAsync() =>
        Merge(await _db.ContentCategorySettings.AsNoTracking().ToListAsync(), _config);

    public async Task<ServiceResult<ContentCategorySettingDto>> UpdateAsync(string category, UpdateContentCategorySettingRequest request, string? userId = null)
    {
        category = (category ?? "").Trim().ToLowerInvariant();
        if (!ContentCategories.IsValid(category))
            return ServiceResult<ContentCategorySettingDto>.Fail("InvalidCategory", $"Category must be one of: {string.Join(", ", ContentCategories.All)}.");

        var problems = new List<ValidationResult>();
        if (!Validator.TryValidateObject(request, new ValidationContext(request), problems, validateAllProperties: true))
            return ServiceResult<ContentCategorySettingDto>.Fail("Invalid", string.Join("; ", problems.Select(p => p.ErrorMessage)));

        if (request.AutoPublish && !ContentCategories.CanAutoPublish(category))
            return ServiceResult<ContentCategorySettingDto>.Fail("AutoPublishNotAllowed",
                "Auto-publish is only available for News and Study Notes. Jobs, results, admit cards, old papers and schemes always need a human check.");
        if (request.AutoPublish && string.IsNullOrEmpty(userId))
            return ServiceResult<ContentCategorySettingDto>.Fail("AutoPublishNeedsUser", "Auto-publish must be switched on by a signed-in admin.");

        var row = await _db.ContentCategorySettings.FindAsync(category);
        if (row is null)
        {
            row = new ContentCategorySetting { Category = category };
            _db.ContentCategorySettings.Add(row);
        }

        row.IsEnabled = request.IsEnabled;
        row.MaxItemsPerRun = request.MaxItemsPerRun;
        row.FreshnessDays = request.FreshnessDays;
        row.ExtraInstructions = string.IsNullOrWhiteSpace(request.ExtraInstructions) ? null : request.ExtraInstructions.Trim();
        if (request.AutoPublish && !row.AutoPublish) row.AutoPublishUserId = userId;
        if (!request.AutoPublish) row.AutoPublishUserId = null;
        row.AutoPublish = request.AutoPublish;
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult<ContentCategorySettingDto>.Ok(ToDto(row));
    }
}
