using System.Globalization;
using System.Text;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data.Entities;

namespace JobPortal.Infrastructure.Services;

/// <summary>Facebook / Instagram captions. Plain text (no markup), per-category template with the same {placeholders}
/// as Telegram plus {hashtags}. Always within Instagram's limits: 2,200 characters and at most 30 hashtags.</summary>
public static class CaptionBuilder
{
    public const int InstagramLimit = 2200;
    public const int MaxHashtags = 30;
    private const int MaxTagLength = 60;

    public static string DefaultTemplate(string category) => category switch
    {
        ContentCategories.Job =>
            "🆕 {title}\n\n🏢 {organization}\n👥 Vacancies: {vacancies}\n🎓 Qualification: {qualification}\n📍 {location}\n📅 Last date: {last_date}\n\n🔗 Apply & full details: {url}",
        ContentCategories.Result =>
            "📢 {title}\n\n🏢 {organization}\n📝 Exam: {exam}\n📅 Result date: {result_date}\n✂️ Cut-off: {cut_off}\n\n🔗 Check result: {url}",
        ContentCategories.AdmitCard =>
            "🎫 {title}\n\n🏢 {organization}\n📝 Exam: {exam}\n📅 Released: {released}\n🗓 Exam date: {exam_date}\n\n🔗 Download admit card: {url}",
        ContentCategories.Scheme =>
            "🏛 {title}\n\n🏢 {ministry}\n🎁 Benefits: {benefits}\n✅ Eligibility: {eligibility}\n\n🔗 Scheme details: {url}",
        _ =>
            "📰 {title}\n\n{summary}\n\n🔗 Read more: {url}",
    };

    public static string[] DefaultHashtags(string category) => category switch
    {
        ContentCategories.Job => new[] { "GovtJobs", "SarkariNaukri", "GujaratJobs", "JobAlert", "Recruitment2026", "JobCharcha" },
        ContentCategories.Result => new[] { "ExamResult", "SarkariResult", "GujaratResult", "ResultOut", "JobCharcha" },
        ContentCategories.AdmitCard => new[] { "AdmitCard", "HallTicket", "ExamAlert", "GujaratExam", "JobCharcha" },
        ContentCategories.Scheme => new[] { "GovtScheme", "SarkariYojana", "GujaratYojana", "YojanaUpdate", "JobCharcha" },
        _ => new[] { "News", "GujaratNews", "GovtUpdates", "JobCharcha" },
    };

    /// <summary>Admin hashtags (space/comma/newline separated, with or without #), cleaned and de-duplicated, capped at 30.
    /// Falls back to the category defaults when the admin hasn't set any.</summary>
    public static List<string> Hashtags(string? custom, string category)
    {
        var source = string.IsNullOrWhiteSpace(custom) ? DefaultHashtags(category) : custom.Split(new[] { ' ', ',', '\n', '\r', '\t', ';' }, StringSplitOptions.RemoveEmptyEntries);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var tags = new List<string>();
        foreach (var raw in source)
        {
            var tag = CleanTag(raw);
            if (tag.Length == 0 || !seen.Add(tag)) continue;
            tags.Add("#" + tag);
            if (tags.Count == MaxHashtags) break;
        }
        return tags;
    }

    private static string CleanTag(string raw)
    {
        var sb = new StringBuilder();
        foreach (var c in raw.TrimStart('#'))
        {
            var cat = char.GetUnicodeCategory(c);
            if (char.IsLetterOrDigit(c) || c == '_' || cat is UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark)
                sb.Append(c);
        }
        var s = sb.ToString();
        return s.Length > MaxTagLength ? s[..MaxTagLength] : s;
    }

    public static string Build(string category, string? template, string? hashtags, string title, string url, IReadOnlyList<SocialDetail> details)
    {
        var tpl = string.IsNullOrWhiteSpace(template) ? DefaultTemplate(category) : template;
        var tags = Hashtags(hashtags, category);
        var values = SocialTemplate.Values(title, url, details);
        var templateHasTags = tpl.Contains("{hashtags}", StringComparison.Ordinal);

        string Compose(List<string> bodyLines, List<string> tagList)
        {
            var text = string.Join('\n', bodyLines);
            if (templateHasTags || tagList.Count == 0) return text;
            return text + "\n\n" + string.Join(' ', tagList);
        }

        List<string> Fill(List<string> tagList)
        {
            values["hashtags"] = string.Join(' ', tagList);
            return SocialTemplate.FillLines(tpl, values, s => s);
        }

        var tagList = tags.ToList();
        var lines = Fill(tagList);
        var result = Compose(lines, tagList);

        // Too long for Instagram: shed hashtags down to 5, then trailing detail lines (never the title or link line).
        while (result.Length > InstagramLimit)
        {
            if (tagList.Count > 5) tagList.RemoveAt(tagList.Count - 1);
            else
            {
                var drop = lines.FindLastIndex(l => l.Length > 0 && !l.Contains(url, StringComparison.Ordinal));
                if (drop <= 0) break;
                lines.RemoveAt(drop);
            }
            if (templateHasTags) lines = Fill(tagList);
            result = Compose(lines, tagList);
        }

        if (result.Length > InstagramLimit) result = result[..(InstagramLimit - 1)].TrimEnd() + "…";
        return result;
    }
}

public static class SocialMessages
{
    /// <summary>The exact text that will be posted to a channel for this share (also what the approval preview shows).</summary>
    public static string Build(string channel, SocialShareJob job, SocialShareSetting setting)
    {
        var details = SocialJobDetails.Read(job.DetailsJson);
        return channel == SocialChannels.Telegram
            ? TelegramMessageRenderer.Render(job.Category, setting.TelegramTemplate, job.Title, job.Url, details, asCaption: !string.IsNullOrWhiteSpace(job.ImageUrl))
            : CaptionBuilder.Build(job.Category, setting.CaptionTemplate, setting.Hashtags, job.Title, job.Url, details);
    }
}
