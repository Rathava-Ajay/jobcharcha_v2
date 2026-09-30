using System.Security.Claims;
using JobPortal.Application.DTOs.Store;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/store/orders")]
[Authorize]
public class StoreOrdersController : ControllerBase
{
    private readonly IStoreOrderService _storeOrderService;

    public StoreOrdersController(IStoreOrderService storeOrderService)
    {
        _storeOrderService = storeOrderService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout(CheckoutRequest request)
    {
        var result = await _storeOrderService.CheckoutAsync(UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify(VerifyStoreOrderRequest request)
    {
        var result = await _storeOrderService.VerifyAsync(UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet]
    public async Task<IActionResult> GetMyOrders() => Ok(await _storeOrderService.GetMyOrdersAsync(UserId));

    [HttpGet("{orderId:int}/download/{orderItemId:int}")]
    public async Task<IActionResult> GetDownloadUrl(int orderId, int orderItemId)
    {
        var result = await _storeOrderService.GetDownloadUrlAsync(UserId, orderId, orderItemId);
        return result.Succeeded ? Ok(new { downloadUrl = result.Data }) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
