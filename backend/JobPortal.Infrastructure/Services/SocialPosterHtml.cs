using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Social;
using Microsoft.Extensions.Configuration;
using SkiaSharp;

namespace JobPortal.Infrastructure.Services;

/// <summary>The data points an HTML poster template can use, as <c>{{token}}</c>. Conditional blocks: <c>{{#token}}…{{/token}}</c> is
/// shown only when the value is not empty, <c>{{^token}}…{{/token}}</c> only when it is empty. Values are HTML-escaped, except the ones
/// marked raw (cards, watermark, logo).</summary>
public static class SocialPosterHtml
{
    public static readonly (string Token, string Label, string Sample)[] DataPoints =
    {
        ("title", "Full title", "GPSSB Junior Clerk Recruitment 2026 - 6843 Posts"),
        ("title_main", "Title (before the dash)", "GPSSB Junior Clerk Recruitment 2026"),
        ("title_highlight", "Title (after the dash)", "6843 Posts"),
        ("org", "Organisation / ministry", "Gujarat Public Service Selection Board (GPSSB)"),
        ("vacancies", "Vacancies", "6843"),
        ("post", "Post name", "Junior Clerk, Multipurpose Health Worker"),
        ("qualification", "Qualification / eligibility", "Graduate in any stream with CCC computer certificate"),
        ("age", "Age limit", "18 - 35 years"),
        ("salary", "Salary / benefits", "Rs 19,900 - 63,200 (Level 2)"),
        ("location", "Location / place of job", "Gujarat (All districts)"),
        ("lastdate", "Key date (last date / result date / exam date)", "25 Oct 2026"),
        ("lastdate_label", "Key date label", "Last date"),
        ("banner", "Banner text (per category)", "RECRUITMENT NOTICE"),
        ("category", "Category (job, result, admitcard, scheme, news)", "job"),
        ("domain", "Site address", "jobcharcha.com"),
        ("site", "Site name", "JobCharcha"),
        ("height", "Poster height in px (1350 portrait / 1080 square)", "1350"),
        ("cards", "All remaining details as ready-made cards (raw HTML)", ""),
        ("watermark", "JobCharcha logo as an image address (use in <img src> or url())", ""),
        ("logo", "Organisation logo image address (empty when none)", ""),
    };

    private static readonly string[] Blocked =
    {
        "<script", "<iframe", "<object", "<embed", "<link", "http-equiv", "<base", "<form", "@import", "javascript:", "file:", "expression(", "behavior:",
    };

    private static readonly Regex EventHandler = new("[\\s\"'/]on\\w+\\s*=", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Url = new(@"(?:src|href)\s*=\s*[""']?\s*(?<u>[^""'\s>]+)|url\(\s*[""']?(?<u>[^""')]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>Null when the template is acceptable; otherwise the reason. Templates run in a headless browser on the server, so no
    /// scripts, frames or links to local files / other hosts are allowed: only inline CSS, data: images and https images.</summary>
    public static string? Validate(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return "The template is empty.";
        if (html.Length > 200_000) return "The template is too large (200 KB maximum).";
        foreach (var b in Blocked)
            if (html.Contains(b, StringComparison.OrdinalIgnoreCase)) return $"\"{b}\" is not allowed in a poster template.";
        if (EventHandler.IsMatch(html)) return "Event handlers such as onclick= or onload= are not allowed in a poster template.";
        foreach (Match m in Url.Matches(html))
        {
            var u = m.Groups["u"].Value.Trim();
            if (u.StartsWith("{{") || u.StartsWith("data:", StringComparison.OrdinalIgnoreCase) || u.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || u.StartsWith('#')) continue;
            return $"Address \"{(u.Length > 40 ? u[..40] + "…" : u)}\" is not allowed. Use a data: image, an https:// image, or a {{{{watermark}}}} / {{{{logo}}}} token.";
        }
        return null;
    }

    public static Dictionary<string, string> Values(SocialImageRequest r, string watermarkUri, string? logoUri)
    {
        string Pick(params string[] labels) =>
            r.Details.FirstOrDefault(d => labels.Any(l => d.Label.Equals(l, StringComparison.OrdinalIgnoreCase)) && d.Value.Length > 0)?.Value ?? "";
        var org = Pick("Organization", "Ministry");
        var keyDate = r.Details.FirstOrDefault(d => d.Value.Length > 0 &&
            (d.Label.Contains("date", StringComparison.OrdinalIgnoreCase) || d.Label.Equals("Released", StringComparison.OrdinalIgnoreCase)));
        var (main, hi) = SocialImageComposer.SplitTitle(r.Title);

        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Organization", "Ministry" };
        if (keyDate is not null) used.Add(keyDate.Label);
        var cards = new StringBuilder();
        foreach (var d in r.Details.Where(d => d.Value.Length > 0 && !used.Contains(d.Label)).Take(SocialImageComposer.HeightFor(r.Size) > 1100 ? 6 : 4))
            cards.Append("<div class=\"card\"><div class=\"card-h\">").Append(WebUtility.HtmlEncode(d.Label.ToUpperInvariant()))
                 .Append("</div><div class=\"card-v\">").Append(WebUtility.HtmlEncode(d.Value)).Append("</div></div>");

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = r.Title, ["title_main"] = main, ["title_highlight"] = hi,
            ["org"] = org, ["vacancies"] = Pick("Vacancies"), ["post"] = Pick("Post"),
            ["qualification"] = Pick("Qualification", "Eligibility"), ["age"] = Pick("Age limit"), ["salary"] = Pick("Salary", "Benefits"),
            ["location"] = Pick("Location"), ["lastdate"] = keyDate?.Value ?? "", ["lastdate_label"] = keyDate?.Label ?? "",
            ["banner"] = SocialImageComposer.BannerFor(r.Category), ["category"] = r.Category,
            ["domain"] = r.Domain, ["site"] = r.SiteName, ["height"] = SocialImageComposer.HeightFor(r.Size).ToString(),
            ["cards"] = cards.ToString(), ["watermark"] = watermarkUri, ["logo"] = logoUri ?? "",
        };
    }

    private static readonly HashSet<string> Raw = new(StringComparer.OrdinalIgnoreCase) { "cards", "watermark", "logo" };
    private static readonly Regex Section = new(@"\{\{([#^])\s*(\w+)\s*\}\}(.*?)\{\{/\s*\2\s*\}\}", RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex Token = new(@"\{\{\s*(\w+)\s*\}\}", RegexOptions.Compiled);

    public static string Fill(string html, IReadOnlyDictionary<string, string> values)
    {
        string Get(string k) => values.TryGetValue(k, out var v) ? v : "";
        for (var pass = 0; pass < 3; pass++)     // nested sections
        {
            var next = Section.Replace(html, m => (m.Groups[1].Value == "#") == (Get(m.Groups[2].Value).Length > 0) ? m.Groups[3].Value : "");
            if (next == html) break;
            html = next;
        }
        return Token.Replace(html, m => Raw.Contains(m.Groups[1].Value) ? Get(m.Groups[1].Value) : WebUtility.HtmlEncode(Get(m.Groups[1].Value)));
    }

    public static IReadOnlyList<SocialDetail> SampleDetails(string category) => category switch
    {
        ContentCategories.Job => new SocialDetail[]
        {
            new("Organization", "Gujarat Public Service Selection Board (GPSSB)"), new("Vacancies", "6843"), new("Post", "Junior Clerk, Multipurpose Health Worker"),
            new("Qualification", "Graduate in any stream with CCC computer certificate"), new("Age limit", "18 - 35 years"),
            new("Salary", "Rs 19,900 - 63,200 (Level 2)"), new("Location", "Gujarat (All districts)"), new("Last date", "25 Oct 2026"),
        },
        ContentCategories.Result => new SocialDetail[]
        {
            new("Organization", "GSSSB Gujarat"), new("Exam", "Junior Clerk 2026"), new("Cut-off", "General 78.5 / OBC 72"), new("Result date", "12 Oct 2026"),
        },
        _ => new SocialDetail[] { new("Organization", "Government of Gujarat"), new("Benefits", "Rs 10,000 per year"), new("Eligibility", "Farmers with up to 2 hectares"), new("Date", "1 Oct 2026") },
    };

    // ================================================================================================
    // Default templates: the Skia poster design, expressed as HTML/CSS in each theme's colours. Starting point for the designer.
    // ================================================================================================

    private static string Hex(SKColor c) => $"#{c.Red:X2}{c.Green:X2}{c.Blue:X2}";

    public static string Default(int slot)
    {
        var t = SocialTheme.For(slot);
        return DefaultHtml
            .Replace("__PAGE__", Hex(t.Page)).Replace("__SKY__", Hex(t.SkyTop)).Replace("__ORG__", Hex(t.OrgText))
            .Replace("__BANNERTEXT__", Hex(t.BannerText)).Replace("__BANNERTAIL__", Hex(t.BannerTail)).Replace("__BANNER__", Hex(t.BannerFill))
            .Replace("__PANEL__", Hex(t.PanelBg)).Replace("__TITLETAIL__", Hex(t.TitleTail)).Replace("__TITLE__", Hex(t.TitleText)).Replace("__BADGE__", Hex(t.TitleBadge))
            .Replace("__CARDHEAD__", Hex(t.CardHead)).Replace("__CARDLABEL__", Hex(t.CardLabel)).Replace("__CARDBODY__", Hex(t.CardBody)).Replace("__CARDTEXT__", Hex(t.CardText))
            .Replace("__DATELEFT__", Hex(t.DateLeft)).Replace("__DATELABEL__", Hex(t.DateLabel)).Replace("__DATEBG__", Hex(t.DateBg)).Replace("__DATETEXT__", Hex(t.DateText))
            .Replace("__FOOTERTEXT__", Hex(t.FooterText)).Replace("__FOOTERDOMAIN__", Hex(t.FooterDomain)).Replace("__FOOTER__", Hex(t.FooterFill))
            .Replace("__RULE__", Hex(t.Rule)).Replace("__WM__", t.Wash == SKColors.White ? Hex(t.OrgText) : "#FFFFFF");
    }

    private const string DefaultHtml = """
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  /* Edit freely. Data points are {{tokens}}; {{#token}}...{{/token}} shows a block only when the value exists. */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: {{height}}px; overflow: hidden; }
  body { position: relative; display: flex; flex-direction: column; padding: 0 40px 18px;
         font-family: 'Noto Sans', 'Noto Sans Gujarati', 'Segoe UI', Arial, sans-serif; font-weight: 700;
         color: __ORG__; background: linear-gradient(180deg, __SKY__ 0%, __PAGE__ 24%); }
  .flag { position: absolute; top: 0; left: 0; width: 200px; height: 200px;
          background: linear-gradient(135deg, #FF9933 0 18%, #fff 18% 28%, #138808 28% 44%, transparent 44%); }
  .flag2 { position: absolute; right: 0; bottom: 0; width: 130px; height: 130px;
           background: linear-gradient(315deg, #FF9933 0 25%, #fff 25% 38%, #138808 38% 62%, transparent 62%); }
  .org { height: 215px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 170px; }
  .org h1 { font-size: 40px; line-height: 1.2; }
  .rule { margin-top: 14px; display: flex; gap: 12px; }
  .rule i { display: block; width: 144px; height: 5px; border-radius: 3px; }
  .banner { margin-top: -4px; height: 98px; flex: none; border-radius: 22px; background: __BANNER__; color: __BANNERTEXT__;
            display: flex; align-items: center; justify-content: center; font-size: 62px; box-shadow: 0 6px 12px rgba(0,0,0,.18); }
  .title { margin-top: 16px; flex: none; border-radius: 24px; background: __PANEL__; padding: 16px 26px; display: flex; align-items: center; gap: 24px; min-height: 180px; }
  .badge { flex: none; width: 100px; height: 100px; border-radius: 50%; background: __BADGE__; color: #fff; display: grid; place-items: center; font-size: 56px; }
  .title-text { font-size: 48px; line-height: 1.16; color: __TITLE__; }
  .title-text span { color: __TITLETAIL__; display: block; }
  .grid { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; flex: 1; grid-auto-rows: 1fr; }
  .card { border-radius: 20px; background: __CARDBODY__; overflow: hidden; display: flex; flex-direction: column; }
  .card-h { background: __CARDHEAD__; color: __CARDLABEL__; font-size: 24px; padding: 8px 20px; }
  .card-v { flex: 1; display: flex; align-items: center; padding: 8px 20px 10px; font-size: 38px; line-height: 1.15; color: __CARDTEXT__; }
  .date { margin-top: 14px; height: 80px; flex: none; border-radius: 20px; background: __DATEBG__; display: flex; align-items: stretch; overflow: hidden; }
  .date-l { flex: none; width: 400px; background: __DATELEFT__; color: __DATELABEL__; display: flex; align-items: center; padding: 0 28px; font-size: 32px; text-transform: uppercase; }
  .date-v { flex: 1; display: flex; align-items: center; padding: 0 28px; font-size: 40px; color: __DATETEXT__; }
  .footer { margin-top: 14px; height: 64px; flex: none; border-radius: 35px; background: __FOOTER__; color: __FOOTERTEXT__;
            display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 28px; font-weight: 500; }
  .footer b { color: __FOOTERDOMAIN__; font-weight: 700; }
  .wm { position: absolute; left: 50%; top: 58%; width: 880px; height: 154px; transform: translate(-50%, -50%) rotate(-18deg); opacity: .14; pointer-events: none;
        background: __WM__; -webkit-mask: url({{watermark}}) center / contain no-repeat; mask: url({{watermark}}) center / contain no-repeat; }
  .logo { position: absolute; top: 26px; right: 40px; width: 124px; height: 124px; border-radius: 18px; background: #fff; display: grid; place-items: center; }
  .logo img { max-width: 104px; max-height: 104px; }
</style>
</head>
<body>
  <div class="flag"></div><div class="flag2"></div>
  {{#logo}}<div class="logo"><img src="{{logo}}" alt=""></div>{{/logo}}
  <div class="org"><h1>{{#org}}{{org}}{{/org}}{{^org}}{{site}}{{/org}}</h1><div class="rule"><i style="background:__RULE__"></i><i style="background:#138808"></i></div></div>
  <div class="banner">{{banner}}</div>
  <div class="title"><div class="badge">&#9679;</div><div class="title-text">{{title_main}}{{#title_highlight}}<span>{{title_highlight}}</span>{{/title_highlight}}</div></div>
  <div class="grid">{{cards}}</div>
  {{#lastdate}}<div class="date"><div class="date-l">{{lastdate_label}}</div><div class="date-v">{{lastdate}}</div></div>{{/lastdate}}
  <div class="footer">Full details &amp; apply link: <b>{{domain}}</b></div>
  <div class="wm"></div>
</body>
</html>
""";
}

/// <summary>Where the admin's HTML poster templates live: one file per slot (0-5), under the uploads folder so they survive a redeploy.
/// A slot with no file keeps using the built-in poster.</summary>
public class PosterTemplateStore
{
    private readonly string _dir;

    public PosterTemplateStore(IConfiguration config)
    {
        var configured = config["SocialShare:TemplatesDir"];
        if (!string.IsNullOrWhiteSpace(configured)) { _dir = configured; return; }
        var root = config["FileStorage:RootPath"] ?? "wwwroot/uploads";
        _dir = Path.Combine(Path.IsPathRooted(root) ? root : Path.Combine(AppContext.BaseDirectory, root), "poster-templates");
    }

    private string PathFor(int slot) => Path.Combine(_dir, $"template-{slot}.html");
    private static bool Valid(int slot) => slot is >= 0 and < SocialTheme.Count;

    /// <summary>The saved HTML for this slot, or null when the admin never customised it.</summary>
    public string? GetCustom(int slot)
    {
        try { return Valid(slot) && File.Exists(PathFor(slot)) ? File.ReadAllText(PathFor(slot)) : null; }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }

    public void Save(int slot, string html)
    {
        if (!Valid(slot)) throw new ArgumentOutOfRangeException(nameof(slot));
        Directory.CreateDirectory(_dir);
        File.WriteAllText(PathFor(slot), html, new UTF8Encoding(false));
    }

    public void Reset(int slot)
    {
        if (Valid(slot) && File.Exists(PathFor(slot))) File.Delete(PathFor(slot));
    }
}
