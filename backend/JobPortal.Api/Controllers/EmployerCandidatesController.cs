using System.Security.Claims;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
[Route("api/employer/candidates")]
[Authorize(Roles = AppRoles.Employer)]
public class EmployerCandidatesController : ControllerBase
{
    private readonly IEmployerContextService _context;
    private readonly IEmployerCandidateService _candidateService;
    private readonly IEmployerContactService _contactService;

    public EmployerCandidatesController(IEmployerContextService context, IEmployerCandidateService candidateService, IEmployerContactService contactService)
    {
        _context = context;
        _candidateService = candidateService;
        _contactService = contactService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] CandidateSearchQuery query)
    {
        var employerProfileId = await _context.ResolveEmployerProfileIdAsync(UserId);
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });

        return Ok(await _candidateService.SearchAsync(query, employerProfileId.Value));
    }

    [HttpGet("{candidateUserId}")]
    public async Task<IActionResult> GetProfile(string candidateUserId)
    {
        var employerProfileId = await _context.ResolveEmployerProfileIdAsync(UserId);
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });

        var result = await _candidateService.GetProfileAsync(candidateUserId, employerProfileId.Value);
        return result.Succeeded ? Ok(result.Data) : NotFound(new { result.ErrorCode, result.Error });
    }

    [HttpPost("{candidateUserId}/contact")]
    public async Task<IActionResult> Contact(string candidateUserId, ContactCandidateRequest request)
    {
        var employerProfileId = await _context.ResolveEmployerProfileIdAsync(UserId);
        if (employerProfileId is null) return NotFound(new { ErrorCode = "NoEmployerProfile", Error = "No employer profile found for this account." });

        var response = await _contactService.AttemptContactAsync(employerProfileId.Value, candidateUserId, request.InitialMessage);
        return Ok(response);
    }
}
