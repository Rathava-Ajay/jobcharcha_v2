namespace JobPortal.Application.Interfaces;

public interface ISitemapService
{
    /// <summary>Builds the full sitemap.xml body as UTF-8 bytes (the sitemap protocol requires UTF-8), ready to write to the response.</summary>
    Task<byte[]> BuildSitemapXmlAsync();
}
