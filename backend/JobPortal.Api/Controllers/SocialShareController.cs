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

    public SocialShareController(ISocialShareService social, ITelegramClient telegram, SocialStatusService status)
    {
        _social = social;
        _telegram = telegram;
        _status = status;
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

    /// <summary>Renders a sample share image with the branded default template (no OpenAI call, no cost) so brand
    /// colours / size can be checked. Returns image/jpeg.</summary>
    [HttpGet("preview-image")]
    public IActionResult PreviewImage([FromQuery] string category = "job", [FromQuery] string size = "square",
        [FromQuery] string? brand = null, [FromQuery] string? accent = null, [FromQuery] string? title = null)
    {
        if (!SocialShareCategories.IsValid(category)) return BadRequest(new { ErrorCode = "InvalidCategory", Error = "Unknown category." });
        var bytes = SocialImageComposer.Compose(new SocialImageRequest(
            category, SocialText.Clean(title, 200) is { Length: > 0 } t ? t : "GSSSB Junior Clerk Recruitment 2026 — Apply Online",
            new List<SocialDetail>
            {
                new("Organization", "GSSSB Gujarat"), new("Vacancies", "1,246 Posts"),
                new("Qualification", "Graduate"), new("Last date", "15 Oct 2026"),
            },
            size, brand, accent, Background: null, Logo: null, SiteName: "JobCharcha", Domain: "jobcharcha.com"));
        return File(bytes, "image/jpeg");
    }

    /// <summary>Channel credentials, OpenAI usage vs cap, and Meta token health (with warnings). ?refresh=true re-checks the token now.</summary>
    [HttpGet("status")]
    public async Task<IActionResult> Status([FromQuery] bool refresh = false, CancellationToken ct = default) =>
        Ok(await _status.GetAsync(refresh, ct));

    // ---- Actions on one queued share ----------------------------------------------------------------

    /// <summary>Approves a share waiting for review (optionally with an edited message) and queues it for posting.</summary>
    [HttpPost("jobs/{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, ApproveShareRequest? request) => Respond(await _social.ApproveAsync(id, request?.Message, UserId));

    [HttpPost("jobs/{id:int}/reject")]
    public async Task<IActionResult> Reject(int id) => Respond(await _social.RejectAsync(id, UserId));

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
}
