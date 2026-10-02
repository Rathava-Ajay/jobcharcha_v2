using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

/// <summary>AI Magic: review queue for AI-collected results, admit cards, old papers, news, schemes and study
/// notes (jobs keep /api/admin/job-drafts). Ingest is called by the per-category agent; approve publishes through
/// the category's existing create service.</summary>
[ApiController]
[Route("api/admin/content-drafts")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class ContentDraftsController : ControllerBase
{
    private readonly IContentDraftService _drafts;
    private readonly IContentSourceService _sources;
    private readonly IContentSyncService _sync;
    private readonly IContentSettingsService _settings;

    public ContentDraftsController(IContentDraftService drafts, IContentSourceService sources, IContentSyncService sync, IContentSettingsService settings)
    {
        _drafts = drafts;
        _sources = sources;
        _sync = sync;
        _settings = settings;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? category, [FromQuery] int? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await _drafts.SearchAsync(category, status, page, pageSize));

    [HttpGet("summary")]
    public async Task<IActionResult> Summary() => Ok(await _drafts.GetSummaryAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var draft = await _drafts.GetByIdAsync(id);
        return draft is null ? NotFound() : Ok(draft);
    }

    /// <summary>200 { outcome, draft } for a valid item (Created / SkippedPending / SkippedReviewed / SkippedPublished);
    /// 400 { errorCode: "InvalidPayload", error } with what's wrong so the agent can fix and resend.</summary>
    [HttpPost("ingest")]
    public async Task<IActionResult> Ingest(IngestContentDraftRequest request)
    {
        var result = await _drafts.IngestAsync(request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, ApproveContentDraftRequest request)
    {
        var result = await _drafts.ApproveAsync(id, request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, RejectContentDraftRequest request)
    {
        var result = await _drafts.RejectAsync(id, request, UserId);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _drafts.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    // ---- Sync ---------------------------------------------------------------------------------

    /// <summary>Starts the AI agent for one category, or every category when none is given. Returns as soon as
    /// the runs are queued.</summary>
    [HttpPost("sync")]
    public async Task<IActionResult> StartSync(StartContentSyncRequest request)
    {
        var result = await _sync.StartAsync(request.Category, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>Cancels one run (?runId=) or, with no id, every queued/running run. A running agent is stopped.</summary>
    [HttpPost("sync/cancel")]
    public async Task<IActionResult> CancelSync([FromQuery] int? runId)
    {
        var result = await _sync.CancelAsync(runId);
        return result.Succeeded ? Ok(new { cancelled = result.Data }) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet("sync/runs")]
    public async Task<IActionResult> Runs([FromQuery] string? category) => Ok(await _sync.GetRecentRunsAsync(category));

    // ---- Per-category settings ----------------------------------------------------------------

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings() => Ok(await _settings.GetAllAsync());

    [HttpPut("settings/{category}")]
    public async Task<IActionResult> UpdateSettings(string category, UpdateContentCategorySettingRequest request)
    {
        var result = await _settings.UpdateAsync(category, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    // ---- Per-category sources -----------------------------------------------------------------

    [HttpGet("sources")]
    public async Task<IActionResult> GetSources([FromQuery] string? category) => Ok(await _sources.GetAllAsync(category));

    [HttpPost("sources")]
    public async Task<IActionResult> CreateSource(UpsertContentSourceRequest request)
    {
        var result = await _sources.CreateAsync(request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPut("sources/{id:int}")]
    public async Task<IActionResult> UpdateSource(int id, UpsertContentSourceRequest request)
    {
        var result = await _sources.UpdateAsync(id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpDelete("sources/{id:int}")]
    public async Task<IActionResult> DeleteSource(int id)
    {
        var result = await _sources.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
