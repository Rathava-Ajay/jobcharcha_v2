using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace JobPortal.Api.Controllers;

[ApiController]
public class SitemapController : ControllerBase
{
    private readonly ISitemapService _sitemapService;

    public SitemapController(ISitemapService sitemapService)
    {
        _sitemapService = sitemapService;
    }

    [HttpGet("/sitemap.xml")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> SitemapXml()
    {
        var xmlBytes = await _sitemapService.BuildSitemapXmlAsync();
        return File(xmlBytes, "application/xml");
    }
}
