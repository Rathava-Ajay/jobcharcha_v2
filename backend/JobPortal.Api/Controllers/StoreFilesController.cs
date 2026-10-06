using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace JobPortal.Api.Controllers;

/// <summary>Serves paid store files that live in the server's private folder. The link is signed, expires in minutes and is issued
/// only by the order-download endpoint after login + ownership + payment checks, so a copied link stops working quickly.</summary>
[ApiController]
[Route("api/store/files")]
public class StoreFilesController : ControllerBase
{
    private const string Purpose = "JobCharcha.StoreFile.v1";
    public static readonly TimeSpan LinkLifetime = TimeSpan.FromMinutes(10);

    private readonly IStoreOrderService _orders;
    private readonly ITimeLimitedDataProtector _protector;
    private readonly string _root;
    private readonly ILogger<StoreFilesController> _logger;

    public StoreFilesController(IStoreOrderService orders, IDataProtectionProvider dp, IConfiguration config, IWebHostEnvironment env, ILogger<StoreFilesController> logger)
    {
        _orders = orders;
        _protector = dp.CreateProtector(Purpose).ToTimeLimitedDataProtector();
        _root = PrivateRoot(config, env);
        _logger = logger;
    }

    /// <summary>Folder that holds the paid files. Set Store__PrivateFilesPath in production so redeploys of the API folder never touch it.</summary>
    public static string PrivateRoot(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Store:PrivateFilesPath"];
        return Path.GetFullPath(string.IsNullOrWhiteSpace(configured) ? Path.Combine(env.ContentRootPath, "private-files") : configured);
    }

    public static string CreateLink(IDataProtectionProvider dp, int orderItemId)
    {
        var token = dp.CreateProtector(Purpose).ToTimeLimitedDataProtector().Protect(orderItemId.ToString(), LinkLifetime);
        return "/api/store/files/" + Uri.EscapeDataString(token);
    }

    [HttpGet("{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> Download(string token)
    {
        int orderItemId;
        try { orderItemId = int.Parse(_protector.Unprotect(token)); }
        catch (Exception) { return NotFound(); }              // forged, tampered or expired

        var name = await _orders.GetPrivateFileNameAsync(orderItemId);
        if (!name.Succeeded) return NotFound();

        var full = Path.GetFullPath(Path.Combine(_root, name.Data!));
        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal) || !System.IO.File.Exists(full))
        {
            _logger.LogError("Private store file missing on disk: {Name} (order item {Item}).", name.Data, orderItemId);
            return NotFound();
        }

        if (!new FileExtensionContentTypeProvider().TryGetContentType(full, out var contentType)) contentType = "application/octet-stream";
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers.XContentTypeOptions = "nosniff";
        return PhysicalFile(full, contentType, Path.GetFileName(full), enableRangeProcessing: true);
    }
}
