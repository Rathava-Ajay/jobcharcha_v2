using System.Net;
using System.Text.RegularExpressions;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Infrastructure.Services;

/// <summary>Links shown in the "join our community" block of outgoing emails. A blank value hides that button.</summary>
public record CommunityLinks(string WebsiteUrl, string? WhatsAppUrl, string? TelegramUrl, string? InstagramUrl, string? InstagramHandle)
{
    public static CommunityLinks From(IConfiguration config, string websiteUrl)
    {
        static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

        var telegram = Clean(config["Community:TelegramUrl"]);
        if (telegram is not null && !telegram.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            telegram = $"https://t.me/{telegram.TrimStart('@', '/')}";

        // Accept "jobcharcha", "@jobcharcha" or a full instagram.com URL.
        var ig = Clean(config["Community:InstagramHandle"]);
        string? igHandle = null, igUrl = null;
        if (ig is not null)
        {
            igHandle = ig.Contains("instagram.com", StringComparison.OrdinalIgnoreCase)
                ? ig.TrimEnd('/').Split('/').Last().Split('?')[0]
                : ig.TrimStart('@');
            igUrl = $"https://instagram.com/{igHandle}";
        }

        return new CommunityLinks(websiteUrl, Clean(config["Community:WhatsAppGroupUrl"]), telegram, igUrl, igHandle);
    }
}

/// <summary>Branded, email-client-safe (table layout, inline CSS) HTML for the job alert sent to subscribers.</summary>
public static class JobAlertEmailTemplate
{
    private const string Brand = "#1d4ed8";

    public static string Build(Job job, string categoryName, string jobUrl, string unsubscribeUrl, CommunityLinks links)
    {
        static string E(string? s) => WebUtility.HtmlEncode(s ?? "");

        var rows = new List<(string Label, string Value)>();
        void Add(string label, string? value) { if (!string.IsNullOrWhiteSpace(value)) rows.Add((label, value.Trim())); }
        Add("Location", job.Location);
        Add("Category", categoryName);
        Add("Salary", job.Salary);
        Add("Qualification", job.QualificationRequired);
        Add("Last date to apply", job.LastDate == default ? null : job.LastDate.ToString("dd MMM yyyy"));

        var details = string.Concat(rows.Select(r => $"""
            <tr>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;width:38%;vertical-align:top;">{E(r.Label)}</td>
              <td style="padding:9px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">{E(r.Value)}</td>
            </tr>
            """));

        var summary = Summarize(job.ShortDescription, 240);
        var summaryHtml = summary is null ? "" :
            $"""<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#334155;">{E(summary)}</p>""";

        var website = links.WebsiteUrl.TrimEnd('/');
        var buttons = new List<string>();
        if (links.WhatsAppUrl is not null) buttons.Add(Pill(links.WhatsAppUrl, "#16a34a", "Join WhatsApp group"));
        if (links.TelegramUrl is not null) buttons.Add(Pill(links.TelegramUrl, "#0284c7", "Join Telegram"));
        if (links.InstagramUrl is not null) buttons.Add(Pill(links.InstagramUrl, "#c026d3", $"Instagram @{E(links.InstagramHandle)}"));
        buttons.Add(Pill(website, "#334155", "Visit jobcharcha.com"));

        var community = $"""
            <tr><td style="padding:24px 28px;background:#f1f5f9;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:#0f172a;">Never miss a vacancy</p>
              <p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#475569;">Get every new government &amp; private job the moment it is posted. Join our community:</p>
              {string.Join("\n", buttons)}
            </td></tr>
            """;

        var preheader = $"{job.OrganizationName} is hiring{(string.IsNullOrWhiteSpace(job.Location) ? "" : $" in {job.Location}")}. Apply before {job.LastDate:dd MMM yyyy}.";

        return $"""
            <!doctype html>
            <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(job.Title)}</title></head>
            <body style="margin:0;padding:0;background:#e8edf5;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{E(preheader)}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;"><tr><td align="center" style="padding:24px 12px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
                  <tr><td style="background:{Brand};padding:18px 28px;">
                    <a href="{E(website)}" style="text-decoration:none;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">JobCharcha</a>
                    <span style="float:right;color:#bfdbfe;font-size:12px;line-height:28px;">New job alert</span>
                  </td></tr>
                  <tr><td style="padding:28px 28px 8px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:{Brand};">{E(categoryName)}</p>
                    <h1 style="margin:0;font-size:22px;line-height:1.3;color:#0f172a;">{E(job.Title)}</h1>
                    <p style="margin:8px 0 0;font-size:15px;color:#475569;">{E(job.OrganizationName)}</p>
                    {summaryHtml}
                  </td></tr>
                  <tr><td style="padding:8px 28px 4px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">{details}</table>
                  </td></tr>
                  <tr><td style="padding:22px 28px 28px;" align="left">
                    <a href="{E(jobUrl)}" style="display:inline-block;background:{Brand};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:10px;">View details &amp; apply &rarr;</a>
                    <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Or copy this link: <a href="{E(jobUrl)}" style="color:#64748b;">{E(jobUrl)}</a></p>
                  </td></tr>
                  {community}
                  <tr><td style="padding:18px 28px;font-size:12px;line-height:1.6;color:#94a3b8;">
                    You are receiving this because you subscribed to JobCharcha job alerts.<br>
                    <a href="{E(unsubscribeUrl)}" style="color:#64748b;">Unsubscribe</a> &middot; <a href="{E(website)}" style="color:#64748b;">jobcharcha.com</a><br>
                    Always verify details on the official notification before applying.
                  </td></tr>
                </table>
              </td></tr></table>
            </body></html>
            """;
    }

    private static string Pill(string url, string colour, string text) =>
        $"""<a href="{WebUtility.HtmlEncode(url)}" style="display:inline-block;margin:0 8px 8px 0;background:{colour};color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:9px 16px;border-radius:999px;">{text}</a>""";

    private static string? Summarize(string? html, int max)
    {
        if (string.IsNullOrWhiteSpace(html)) return null;
        var text = WebUtility.HtmlDecode(Regex.Replace(html, "<[^>]+>", " "));
        text = Regex.Replace(text, @"\s+", " ").Trim();
        if (text.Length == 0) return null;
        return text.Length <= max ? text : text[..max].TrimEnd() + "…";
    }
}
