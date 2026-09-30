using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class JobFeedSourceService : IJobFeedSourceService
{
    private readonly AppDbContext _db;

    public JobFeedSourceService(AppDbContext db)
    {
        _db = db;
    }

    private static JobFeedSourceDto ToDto(JobFeedSource s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        OrganizationHint = s.OrganizationHint,
        SourceType = s.SourceType,
        Url = s.Url,
        DefaultCategoryId = s.DefaultCategoryId,
        DefaultCategoryName = s.DefaultCategory?.Name,
        StateHint = s.StateHint,
        LastFetchedAt = s.LastFetchedAt,
        LastFetchNewCount = s.LastFetchNewCount,
        LastFetchSkippedReviewedCount = s.LastFetchSkippedReviewedCount,
        LastFetchSkippedPendingCount = s.LastFetchSkippedPendingCount,
        LastError = s.LastError,
        IsActive = s.IsActive,
        CreatedDate = s.CreatedDate,
    };

    public async Task<List<JobFeedSourceDto>> GetAllAsync() =>
        await _db.JobFeedSources.AsNoTracking().Include(s => s.DefaultCategory)
            .OrderBy(s => s.Name).Select(s => ToDto(s)).ToListAsync();

    public async Task<JobFeedSourceDto?> GetByIdAsync(int id)
    {
        var s = await _db.JobFeedSources.AsNoTracking().Include(x => x.DefaultCategory)
            .FirstOrDefaultAsync(x => x.Id == id);
        return s is null ? null : ToDto(s);
    }

    public async Task<ServiceResult<JobFeedSourceDto>> CreateAsync(UpsertJobFeedSourceRequest request)
    {
        var entity = new JobFeedSource
        {
            Name = request.Name.Trim(),
            OrganizationHint = request.OrganizationHint,
            SourceType = request.SourceType,
            Url = request.Url.Trim(),
            DefaultCategoryId = request.DefaultCategoryId,
            StateHint = request.StateHint,
            IsActive = request.IsActive,
            CreatedDate = DateTime.UtcNow,
            LastFetchNewCount = 0,
        };
        _db.JobFeedSources.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceResult<JobFeedSourceDto>.Ok((await GetByIdAsync(entity.Id))!);
    }

    public async Task<ServiceResult<JobFeedSourceDto>> UpdateAsync(int id, UpsertJobFeedSourceRequest request)
    {
        var entity = await _db.JobFeedSources.FindAsync(id);
        if (entity is null) return ServiceResult<JobFeedSourceDto>.Fail("NotFound", "Feed source not found.");

        entity.Name = request.Name.Trim();
        entity.OrganizationHint = request.OrganizationHint;
        entity.SourceType = request.SourceType;
        entity.Url = request.Url.Trim();
        entity.DefaultCategoryId = request.DefaultCategoryId;
        entity.StateHint = request.StateHint;
        entity.IsActive = request.IsActive;
        entity.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult<JobFeedSourceDto>.Ok((await GetByIdAsync(id))!);
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _db.JobFeedSources.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Feed source not found.");
        _db.JobFeedSources.Remove(entity);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ReportFetchAsync(int id, ReportFeedFetchRequest request)
    {
        var entity = await _db.JobFeedSources.FindAsync(id);
        if (entity is null) return ServiceResult.Fail("NotFound", "Feed source not found.");

        entity.LastFetchedAt = DateTime.UtcNow;
        entity.LastFetchNewCount = request.NewDraftCount;
        entity.LastFetchSkippedReviewedCount = request.SkippedReviewedCount;
        entity.LastFetchSkippedPendingCount = request.SkippedPendingCount;
        entity.LastError = request.Error;
        entity.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
