using System.Security.Claims;
using JobPortal.Application.DTOs.Payments;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("order")]
    public async Task<IActionResult> CreateOrder(CreateOrderRequest request)
    {
        var result = await _paymentService.CreateOrderAsync(UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify(VerifyPaymentRequest request)
    {
        var result = await _paymentService.VerifyPaymentAsync(UserId, request);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.ErrorCode, result.Error });
    }

    [HttpGet("history")]
    public async Task<IActionResult> History() => Ok(await _paymentService.GetHistoryAsync(UserId));

    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault();

        var isValid = await _paymentService.HandleWebhookAsync(rawBody, signature);
        return isValid ? Ok() : BadRequest();
    }
}
