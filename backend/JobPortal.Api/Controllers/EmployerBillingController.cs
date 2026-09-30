using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/employer")]
[Authorize(Roles = AppRoles.Employer)]
public class EmployerBillingController : ControllerBase
{
    private readonly IEmployerContextService _context;
    private readonly IEmployerContactService _contactService;
    private readonly IEmployerBillingService _billingService;

    public EmployerBillingController(IEmployerContextService context, IEmployerContactService contactService, IEmployerBillingService billingService)
    {
        _context = context;
        _contactService = contactService;
        _billingService = billingService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<int?> ResolveEmployerAsync() => await _context.ResolveEmployerProfileIdAsync(UserId);

    [HttpGet("subscription")]
    public async Task<IActionResult> GetSubscription()
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        return Ok(await _billingService.GetSubscriptionAsync(employerProfileId.Value));
    }

    [HttpGet("credits")]
    public async Task<IActionResult> GetCredits()
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        return Ok(await _billingService.GetCreditsAsync(employerProfileId.Value));
    }

    [HttpGet("contact-history")]
    public async Task<IActionResult> GetContactHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        return Ok(await _contactService.GetHistoryAsync(employerProfileId.Value, page, pageSize));
    }

    [HttpPost("subscription/renew")]
    public async Task<IActionResult> RenewSubscription(RenewSubscriptionRequest request)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _billingService.CreateRenewOrderAsync(employerProfileId.Value, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("credits/top-up")]
    public async Task<IActionResult> TopUpCredits(TopUpCreditsRequest request)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _billingService.CreateTopUpOrderAsync(employerProfileId.Value, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("payments/verify")]
    public async Task<IActionResult> VerifyPayment(EmployerVerifyPaymentRequest request)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var result = await _billingService.VerifyPaymentAsync(employerProfileId.Value, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet("acknowledge-terms")]
    public async Task<IActionResult> GetAcknowledgmentStatus()
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        return Ok(await _billingService.GetAcknowledgmentStatusAsync(employerProfileId.Value));
    }

    [HttpPost("acknowledge-terms")]
    public async Task<IActionResult> AcknowledgeTerms(AcknowledgeTermsRequest request)
    {
        var employerProfileId = await ResolveEmployerAsync();
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _billingService.AcknowledgeTermsAsync(employerProfileId.Value, request, ip);
        return result.Succeeded ? Ok() : BadRequest(new { result.ErrorCode, result.Error });
    }
}
