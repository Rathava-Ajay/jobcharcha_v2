using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Payments;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/admin/payments")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class AdminPaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public AdminPaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("{id:int}/refund")]
    public async Task<IActionResult> Refund(int id, RefundPaymentRequest request)
    {
        var result = await _paymentService.AdminRefundAsync(id, UserId, request.Reason);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>"Pending" payments old enough that the client's /verify callback plausibly never
    /// arrived — candidates for <see cref="Resync"/>.</summary>
    [HttpGet("stuck")]
    public async Task<IActionResult> GetStuck([FromQuery] int olderThanMinutes = 30) =>
        Ok(await _paymentService.GetStuckPendingPaymentsAsync(olderThanMinutes));

    /// <summary>Re-checks a stuck Pending payment against Razorpay's own records and resolves it
    /// to Paid/Failed accordingly — for the case where the user actually paid but the browser
    /// never made it back to call /verify.</summary>
    [HttpPost("{id:int}/resync")]
    public async Task<IActionResult> Resync(int id)
    {
        var result = await _paymentService.ResyncPaymentAsync(id);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>Chargebacks/disputes raised via Razorpay's payment.dispute.* webhooks.</summary>
    [HttpGet("disputes")]
    public async Task<IActionResult> GetDisputes([FromQuery] string? status) =>
        Ok(await _paymentService.GetDisputesAsync(status));

    /// <summary>Read-only Razorpay connectivity + config check. No money moves. Use this to confirm
    /// a deploy's Razorpay keys are valid without having to complete a real payment.</summary>
    [HttpGet("razorpay-health")]
    public async Task<IActionResult> RazorpayHealth() => Ok(await _paymentService.CheckRazorpayHealthAsync());
}
