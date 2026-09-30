using System.Text;
using System.Xml;
using System.Xml.Linq;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Infrastructure.Services;

public class SitemapService : ISitemapService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    private static readonly XNamespace Ns = "http://www.sitemaps.org/schemas/sitemap/0.9";

    // Path prefix, change frequency, priority — mirrors App.tsx's real routes.
    private static readonly (string Path, string ChangeFreq, string Priority)[] StaticPages =
    {
        ("/", "daily", "1.0"),
        ("/jobs", "daily", "0.9"),
        ("/results", "daily", "0.9"),
        ("/admit-cards", "daily", "0.9"),
        ("/mock-tests", "weekly", "0.8"),
        ("/old-papers", "weekly", "0.7"),
        ("/daily-quiz", "daily", "0.7"),
        ("/blog", "weekly", "0.6"),
        ("/news", "daily", "0.7"),
        ("/schemes", "weekly", "0.6"),
        ("/job-alerts", "monthly", "0.5"),
        ("/about", "yearly", "0.3"),
        ("/contact", "yearly", "0.3"),
        ("/privacy", "yearly", "0.2"),
        ("/terms", "yearly", "0.2"),
        ("/refund-policy", "yearly", "0.2"),
        ("/shipping-policy", "yearly", "0.2"),
    };

    public SitemapService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<byte[]> BuildSitemapXmlAsync()
    {
        var baseUrl = (_config["App:FrontendBaseUrl"] ?? "http://localhost:3000").TrimEnd('/');

        var urlset = new XElement(Ns + "urlset");

        foreach (var (path, changeFreq, priority) in StaticPages)
        {
            urlset.Add(BuildUrlElement($"{baseUrl}{path}", null, changeFreq, priority));
        }

        var jobs = await _db.Jobs.AsNoTracking()
            .Where(j => j.IsActive)
            .Select(j => new { j.Slug, j.UpdatedDate, j.PostedDate })
            .ToListAsync();
        foreach (var j in jobs)
            urlset.Add(BuildUrlElement($"{baseUrl}/jobs/{j.Slug}", j.UpdatedDate ?? j.PostedDate, "daily", "0.8"));

        var results = await _db.Results.AsNoTracking()
            .Where(r => r.IsActive)
            .Select(r => new { r.Slug, r.UpdatedDate, r.CreatedDate })
            .ToListAsync();
        foreach (var r in results)
            urlset.Add(BuildUrlElement($"{baseUrl}/results/{r.Slug}", r.UpdatedDate ?? r.CreatedDate, "weekly", "0.7"));

        var admitCards = await _db.AdmitCards.AsNoTracking()
            .Where(a => a.IsActive)
            .Select(a => new { a.Slug, a.UpdatedDate, a.CreatedDate })
            .ToListAsync();
        foreach (var a in admitCards)
            urlset.Add(BuildUrlElement($"{baseUrl}/admit-cards/{a.Slug}", a.UpdatedDate ?? a.CreatedDate, "weekly", "0.7"));

        var blogs = await _db.Blogs.AsNoTracking()
            .Where(b => b.IsActive && b.IsPublished)
            .Select(b => new { b.Slug, b.UpdatedDate, b.PublishedDate })
            .ToListAsync();
        foreach (var b in blogs)
            urlset.Add(BuildUrlElement($"{baseUrl}/blog/{b.Slug}", b.UpdatedDate ?? b.PublishedDate, "monthly", "0.6"));

        var news = await _db.News.AsNoTracking()
            .Where(n => n.IsActive)
            .Select(n => new { n.Slug, n.UpdatedDate, n.PublishedDate })
            .ToListAsync();
        foreach (var n in news)
            urlset.Add(BuildUrlElement($"{baseUrl}/news/{n.Slug}", n.UpdatedDate ?? n.PublishedDate, "monthly", "0.6"));

        var schemes = await _db.GovtSchemes.AsNoTracking()
            .Where(s => s.IsActive)
            .Select(s => new { s.Slug, s.UpdatedDate, s.CreatedDate })
            .ToListAsync();
        foreach (var s in schemes)
            urlset.Add(BuildUrlElement($"{baseUrl}/schemes/{s.Slug}", s.UpdatedDate ?? s.CreatedDate, "monthly", "0.5"));

        var oldPapers = await _db.OldPapers.AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new { p.Slug, p.UpdatedDate, p.CreatedDate })
            .ToListAsync();
        foreach (var p in oldPapers)
            urlset.Add(BuildUrlElement($"{baseUrl}/old-papers/{p.Slug}", p.UpdatedDate ?? p.CreatedDate, "monthly", "0.5"));

        var doc = new XDocument(new XDeclaration("1.0", "UTF-8", null), urlset);

        // XDocument.Save(TextWriter) writes whatever encoding the writer reports (always
        // UTF-16 for a plain StringWriter), regardless of the XDeclaration above — that
        // would mismatch the UTF-8 bytes actually sent over HTTP. Writing through an
        // XmlWriter backed by a UTF-8 MemoryStream keeps the declared and actual encoding
        // in sync, which the sitemap protocol requires.
        using var stream = new MemoryStream();
        var settings = new XmlWriterSettings { Encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false), Indent = true };
        using (var xmlWriter = XmlWriter.Create(stream, settings))
        {
            doc.Save(xmlWriter);
        }
        return stream.ToArray();
    }

    private static XElement BuildUrlElement(string loc, DateTime? lastMod, string changeFreq, string priority)
    {
        var el = new XElement(Ns + "url", new XElement(Ns + "loc", loc));
        if (lastMod.HasValue)
            el.Add(new XElement(Ns + "lastmod", lastMod.Value.ToString("yyyy-MM-dd")));
        el.Add(new XElement(Ns + "changefreq", changeFreq));
        el.Add(new XElement(Ns + "priority", priority));
        return el;
    }
}
