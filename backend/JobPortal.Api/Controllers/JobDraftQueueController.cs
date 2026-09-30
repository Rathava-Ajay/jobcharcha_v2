using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

/// <summary>Review queue for jobs the watcher agent found on watched sites/Telegram channels.
/// Ingest is called by the agent; everything else is the admin review UI (approve publishes the
/// job via the same AI-import pipeline the manual mobile-post flow uses, reject/delete just clear
/// the queue row).</summary>
[ApiController]
[Route("api/admin/job-drafts")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class JobDraftQueueController : ControllerBase
{
    private readonly IJobDraftQueueService _service;

    public JobDraftQueueController(IJobDraftQueueService service)
    {
        _service = service;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] int? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await _service.SearchAsync(status, page, pageSize));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var draft = await _service.GetByIdAsync(id);
        return draft is null ? NotFound() : Ok(draft);
    }

    /// <summary>Always 200 for a well-formed posting: { outcome, draft } where outcome is Created,
    /// SkippedPending, SkippedReviewed, or SkippedPublished (see JobDraftIngestOutcome).</summary>
    [HttpPost("ingest")]
    public async Task<IActionResult> Ingest(CreateJobDraftRequest request)
    {
        var result = await _service.IngestAsync(request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, AiImportJobRequest request)
    {
        var result = await _service.ApproveAsync(id, request, UserId);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, RejectJobDraftRequest request)
    {
        var result = await _service.RejectAsync(id, request, UserId);
        // NoContent (204), not Ok() — apiFetch only special-cases 204 to skip response.json(),
        // and a 200 with an empty body throws there, which the frontend was misreporting as
        // "Could not reject this draft" even though this call had already succeeded.
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
