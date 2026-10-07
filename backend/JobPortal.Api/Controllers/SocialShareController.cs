using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

/// <summary>Auto-share to Telegram / Facebook / Instagram: manual "Share again" and (in later steps) the
/// activity log, approvals and per-category settings.</summary>
[ApiController]
[Route("api/admin/social")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class SocialShareController : ControllerBase
{
    private readonly ISocialShareService _social;
    private readonly ITelegramClient _telegram;
    private readonly SocialStatusService _status;
    private readonly SocialPreviewService _preview;
    private readonly SocialPosterService _posters;

    public SocialShareController(ISocialShareService social, ITelegramClient telegram, SocialStatusService status, SocialPreviewService preview, SocialPosterService posters)
    {
        _social = social;
        _telegram = telegram;
        _status = status;
        _preview = preview;
        _posters = posters;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>Queues a fresh round of shares for a live post. 200 { queued }.</summary>
    [HttpPost("share-again")]
    public async Task<IActionResult> ShareAgain(ShareAgainRequest request)
    {
        var result = await _social.ShareAgainAsync(request.Category, request.EntityId, UserId);
        return result.Succeeded ? Ok(new { queued = result.Data }) : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>Sends a harmless test message to the Telegram channel so the bot token / channel id can be checked.</summary>
    [HttpPost("telegram-test")]
    public async Task<IActionResult> TelegramTest(CancellationToken ct)
    {
        try
        {
            var id = await _telegram.SendMessageAsync("✅ <b>JobCharcha auto-share test</b>\nTelegram is connected.", "Open site", "https://jobcharcha.com", ct);
            return Ok(new { messageId = id });
        }
        catch (SocialShareException ex)
        {
            return BadRequest(new { ErrorCode = "TelegramFailed", Error = ex.Message });
        }
    }

    /// <summary>Renders a sample share image with the branded default template so brand
    /// colours / size can be checked. Returns image/jpeg.</summary>
    [HttpGet("preview-image")]
    public IActionResult PreviewImage([FromQuery] string category = "job", [FromQuery] string size = "square",
        [FromQuery] string? brand = null, [FromQuery] string? accent = null, [FromQuery] string? title = null, [FromQuery] int template = 0)
    {
        if (!SocialShareCategories.IsValid(category)) return BadRequest(new { ErrorCode = "InvalidCategory", Error = "Unknown category." });
        var bytes = SocialImageComposer.Compose(new SocialImageRequest(
            category, SocialText.Clean(title, 200) is { Length: > 0 } t ? t : "GSSSB Junior Clerk Recruitment 2026 — Apply Online",
            new List<SocialDetail>
            {
                new("Organization", "GSSSB Gujarat"), new("Vacancies", "1,246 Posts"),
                new("Qualification", "Graduate"), new("Last date", "15 Oct 2026"),
            },
            size, brand, accent, Background: null, Logo: null, SiteName: "JobCharcha", Domain: "jobcharcha.com", Template: template));
        return File(bytes, "image/jpeg");
    }

    /// <summary>Channel credentials and Meta token health (with warnings). ?refresh=true re-checks the token now.</summary>
    [HttpGet("status")]
    public async Task<IActionResult> Status([FromQuery] bool refresh = false, CancellationToken ct = default) =>
        Ok(await _status.GetAsync(refresh, ct));

    // ---- Actions on one queued share ----------------------------------------------------------------

    /// <summary>Approves a share waiting for review (optionally with an edited message) and queues it for posting.</summary>
    [HttpPost("jobs/{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, ApproveShareRequest? request) => Respond(await _social.ApproveAsync(id, request?.Message, UserId));

    [HttpPost("jobs/{id:int}/reject")]
    public async Task<IActionResult> Reject(int id) => Respond(await _social.RejectAsync(id, UserId));

    /// <summary>Cancels a queued / waiting share so it is never posted.</summary>
    [HttpPost("jobs/{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id) => Respond(await _social.CancelAsync(id, UserId));

    /// <summary>Marks a queued/failed share as posted when it is already live on the channel.</summary>
    [HttpPost("jobs/{id:int}/complete")]
    public async Task<IActionResult> Complete(int id) => Respond(await _social.CompleteAsync(id, UserId));

    /// <summary>Retry button for a failed share.</summary>
    [HttpPost("jobs/{id:int}/retry")]
    public async Task<IActionResult> Retry(int id) => Respond(await _social.RetryAsync(id, UserId));

    /// <summary>Discards the generated image/message so a fresh preview is built.</summary>
    [HttpPost("jobs/{id:int}/regenerate")]
    public async Task<IActionResult> Regenerate(int id) => Respond(await _social.RegenerateAsync(id));

    private IActionResult Respond(ServiceResult result) =>
        result.Succeeded ? NoContent() : BadRequest(new { result.ErrorCode, result.Error });

    // ---- Activity log & settings ---------------------------------------------------------------------

    /// <summary>Paged activity log, newest first. Filters: status (0 awaiting approval, 1 pending, 2 posted, 3 failed, 4 skipped, 5 processing), category, channel.</summary>
    [HttpGet("jobs")]
    public async Task<IActionResult> Jobs([FromQuery] int? status, [FromQuery] string? category, [FromQuery] string? channel,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await _social.SearchAsync(status, category, channel, page, pageSize));

    [HttpGet("jobs/summary")]
    public async Task<IActionResult> Summary() => Ok(await _social.GetSummaryAsync());

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings() => Ok(await _social.GetSettingsAsync());

    [HttpPut("settings/{category}")]
    public async Task<IActionResult> UpdateSettings(string category, UpdateSocialShareSettingRequest request)
    {
        var result = await _social.UpdateSettingAsync(category, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>Renders the share image for an existing published post (image/jpeg). Uses the built-in or designed poster; free.
    [HttpGet("post-preview")]
    public async Task<IActionResult> PostPreview([FromQuery] string category, [FromQuery] int entityId, [FromQuery] int? template = null, CancellationToken ct = default)
    {
        var result = await _preview.RenderAsync(category, entityId, template, ct);
        return result.Succeeded ? File(result.Data!, "image/jpeg") : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>Replaces the share image's hero picture with one the admin uploaded (JPG / PNG / WebP, up to 10 MB). Returns the new image URL.</summary>
    [HttpPost("jobs/{id:int}/hero")]
    [RequestSizeLimit(SocialPreviewService.MaxHeroBytes + 1024 * 1024)]
    public async Task<IActionResult> UploadHero(int id, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { ErrorCode = "BadImage", Error = "Choose a picture to upload." });
        if (file.Length > SocialPreviewService.MaxHeroBytes) return BadRequest(new { ErrorCode = "BadImage", Error = "Choose a picture up to 10 MB." });

        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var result = await _preview.SetCustomHeroAsync(id, ms.ToArray(), ct);
        return result.Succeeded ? Ok(new { imageUrl = result.Data }) : BadRequest(new { result.ErrorCode, result.Error });
    }

    // ---- HTML poster designer ------------------------------------------------------------------------

    public record SaveTemplateRequest(string Html);
    public record RenderTemplateRequest(string Html, string? Category, string? Size, int Template);

    /// <summary>The six template slots: name, whether the admin customised it, and the HTML currently in use (custom or the built-in design as HTML).</summary>
    [HttpGet("templates")]
    public IActionResult Templates() => Ok(new
    {
        browserPath = _posters.BrowserPath,
        dataPoints = SocialPosterHtml.DataPoints.Select(d => new { token = d.Token, label = d.Label, sample = d.Sample }),
        templates = Enumerable.Range(0, SocialTheme.Count).Select(i =>
        {
            var custom = _posters.Store.GetCustom(i);
            return new { slot = i, name = SocialTheme.For(i).Name, custom = custom is not null, html = custom ?? SocialPosterHtml.Default(i) };
        }),
    });

    [HttpGet("templates/{slot:int}/default")]
    public IActionResult DefaultTemplate(int slot) =>
        slot is >= 0 and < SocialTheme.Count ? Ok(new { html = SocialPosterHtml.Default(slot) }) : NotFound();

    [HttpPut("templates/{slot:int}")]
    public IActionResult SaveTemplate(int slot, SaveTemplateRequest request)
    {
        if (slot is < 0 or >= SocialTheme.Count) return NotFound();
        if (SocialPosterHtml.Validate(request.Html) is { } problem) return BadRequest(new { ErrorCode = "InvalidTemplate", Error = problem });
        _posters.Store.Save(slot, request.Html);
        return NoContent();
    }

    /// <summary>Goes back to the built-in poster for this slot.</summary>
    [HttpDelete("templates/{slot:int}")]
    public IActionResult ResetTemplate(int slot)
    {
        if (slot is < 0 or >= SocialTheme.Count) return NotFound();
        _posters.Store.Reset(slot);
        return NoContent();
    }

    /// <summary>Draws the (unsaved) HTML on the server exactly as a real share would be, with sample data. Returns image/jpeg.</summary>
    [HttpPost("templates/render")]
    public async Task<IActionResult> RenderTemplate(RenderTemplateRequest request, CancellationToken ct)
    {
        if (SocialPosterHtml.Validate(request.Html) is { } problem) return BadRequest(new { ErrorCode = "InvalidTemplate", Error = problem });
        var category = SocialShareCategories.IsValid(request.Category ?? "") ? request.Category! : "job";
        var size = string.Equals(request.Size, "square", StringComparison.OrdinalIgnoreCase) ? "square" : "portrait";
        var req = new SocialImageRequest(category, "GPSSB Junior Clerk Recruitment 2026 - 6843 Posts", SocialPosterHtml.SampleDetails(category), size,
            null, null, null, null, "JobCharcha", "jobcharcha.com", request.Template);
        try { return File(await _posters.RenderAsync(request.Html, req, ct), "image/jpeg"); }
        catch (SocialShareException ex) { return StatusCode(503, new { ErrorCode = "RenderFailed", Error = ex.Message }); }
    }
}
