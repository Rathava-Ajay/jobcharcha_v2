using JobPortal.Application.Common;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

/// <summary>
/// Employer-scoped counterpart to <see cref="AdminUploadsController"/> — lets a verified employer
/// attach a single job-details file (PDF or image) to a posting. Same size/type limits as the
/// admin endpoint; files land under <c>/uploads/employer-jobs/…</c>.
/// </summary>
[ApiController]
[Route("api/employer/uploads")]
[Authorize(Roles = AppRoles.Employer)]
public class EmployerUploadsController : ControllerBase
{
    private readonly IFileStorageService _fileStorage;

    public EmployerUploadsController(IFileStorageService fileStorage)
    {
        _fileStorage = fileStorage;
    }

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".png", ".jpg", ".jpeg", ".webp" };

    private static readonly HashSet<string> AllowedContentTypes =
        new(StringComparer.OrdinalIgnoreCase)
        { "application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp" };

    [HttpPost("document")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> UploadDocument(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext) || !AllowedContentTypes.Contains(file.ContentType))
            return BadRequest("Only PDF or image files (PDF, PNG, JPG, WEBP) are allowed.");

        await using var stream = file.OpenReadStream();
        var url = await _fileStorage.SaveAsync(stream, file.FileName, file.ContentType, "employer-jobs");
        return Ok(new { url, fileName = file.FileName });
    }
}
