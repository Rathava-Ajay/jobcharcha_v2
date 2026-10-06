using JobPortal.Application.DTOs.Contact;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController : ControllerBase
{
    private readonly IContactService _contactService;

    public ContactController(IContactService contactService)
    {
        _contactService = contactService;
    }

    [HttpPost]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Submit(ContactSubmitRequest request)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();
        var result = await _contactService.SubmitAsync(request, ipAddress, userAgent);
        return result.Succeeded ? Ok(new { message = "Thanks for reaching out — we'll get back to you shortly." }) : BadRequest(new { result.ErrorCode, result.Error });
    }
}
