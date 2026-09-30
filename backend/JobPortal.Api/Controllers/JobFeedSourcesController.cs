using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

/// <summary>Admin-managed list of official sites/Telegram channels the watcher agent polls for new
/// job postings. The agent itself reads this list (via GET) and reports back via /fetch-report; it
/// authenticates the same way any other admin API caller does (POST /api/auth/login).</summary>
[ApiController]
[Route("api/admin/job-feed-sources")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class JobFeedSourcesController : ControllerBase
{
    private readonly IJobFeedSourceService _service;
    private readonly IWatcherAgentSyncService _syncService;

    public JobFeedSourcesController(IJobFeedSourceService service, IWatcherAgentSyncService syncService)
    {
        _service = service;
        _syncService = syncService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var source = await _service.GetByIdAsync(id);
        return source is null ? NotFound() : Ok(source);
    }

    [HttpPost]
    public async Task<IActionResult> Create(UpsertJobFeedSourceRequest request)
    {
        var result = await _service.CreateAsync(request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertJobFeedSourceRequest request)
    {
        var result = await _service.UpdateAsync(id, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/fetch-report")]
    public async Task<IActionResult> ReportFetch(int id, ReportFeedFetchRequest request)
    {
        var result = await _service.ReportFetchAsync(id, request);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>Manually kicks off the watcher agent instead of waiting for its scheduled cadence.
    /// Fire-and-forget — returns as soon as the run is started, not when it finishes.</summary>
    [HttpPost("sync-now")]
    public async Task<IActionResult> SyncNow()
    {
        var result = await _syncService.TriggerNowAsync();
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
