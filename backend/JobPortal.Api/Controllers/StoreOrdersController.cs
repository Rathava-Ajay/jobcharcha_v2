using System.Security.Claims;
using JobPortal.Application.DTOs.Store;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/store/orders")]
[Authorize]
public class StoreOrdersController : ControllerBase
{
    private readonly IStoreOrderService _storeOrderService;
    private readonly IDataProtectionProvider _dataProtection;

    public StoreOrdersController(IStoreOrderService storeOrderService, IDataProtectionProvider dataProtection)
    {
        _storeOrderService = storeOrderService;
        _dataProtection = dataProtection;
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
        if (!result.Succeeded) return BadRequest(new { result.ErrorCode, result.Error });

        // Private files are streamed by this API through a short-lived signed link; Drive-hosted ones keep their stored link.
        var url = result.Data!.StartsWith(JobPortal.Infrastructure.Services.StoreOrderService.PrivateItemMarker, StringComparison.Ordinal)
            ? StoreFilesController.CreateLink(_dataProtection, int.Parse(result.Data[JobPortal.Infrastructure.Services.StoreOrderService.PrivateItemMarker.Length..]))
            : result.Data;
        return Ok(new { downloadUrl = url });
    }
}
