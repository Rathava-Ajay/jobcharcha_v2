using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Store;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/admin/store-orders")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SuperAdmin}")]
public class AdminStoreOrdersController : ControllerBase
{
    private readonly IStoreOrderService _storeOrderService;

    public AdminStoreOrdersController(IStoreOrderService storeOrderService)
    {
        _storeOrderService = storeOrderService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("{id:int}/refund")]
    public async Task<IActionResult> Refund(int id, RefundStoreOrderRequest request)
    {
        var result = await _storeOrderService.AdminRefundAsync(id, UserId, request.Reason);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
