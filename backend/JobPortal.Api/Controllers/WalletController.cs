using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Payments;
using JobPortal.Application.DTOs.Wallet;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;

    public WalletController(IWalletService walletService)
    {
        _walletService = walletService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance() => Ok(new WalletBalanceDto { Balance = await _walletService.GetBalanceAsync(UserId) });

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions() => Ok(await _walletService.GetMyTransactionsAsync(UserId));

    [HttpPost("topup/order")]
    public async Task<IActionResult> CreateTopUpOrder(WalletTopUpOrderRequest request)
    {
        var result = await _walletService.CreateTopUpOrderAsync(UserId, request.Amount);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("topup/verify")]
    public async Task<IActionResult> VerifyTopUp(VerifyPaymentRequest request)
    {
        var result = await _walletService.VerifyTopUpAsync(UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/search")]
    public async Task<IActionResult> AdminSearch([FromQuery] string query)
    {
        var result = await _walletService.AdminSearchAsync(query);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpPost("admin/{userId}/adjust")]
    public async Task<IActionResult> AdminAdjust(string userId, AdminAdjustWalletRequest request)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _walletService.AdminAdjustAsync(userId, request.Amount, request.Notes, adminUserId, ipAddress);
        return result.Succeeded ? Ok(new { balance = result.Data }) : BadRequest(new { result.ErrorCode, result.Error });
    }

    /// <summary>Immutable audit trail of every admin wallet credit/debit — filterable by admin or target user.</summary>
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
    [HttpGet("admin/audit")]
    public async Task<IActionResult> GetAdminAuditLog([FromQuery] string? adminUserId, [FromQuery] string? targetUserId, [FromQuery] int page = 1, [FromQuery] int pageSize = 30) =>
        Ok(await _walletService.GetAdminAuditLogAsync(adminUserId, targetUserId, page, pageSize));
}
