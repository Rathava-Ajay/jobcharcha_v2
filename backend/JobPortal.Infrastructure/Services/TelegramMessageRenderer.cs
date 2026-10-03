using System.Text.RegularExpressions;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Social;

namespace JobPortal.Infrastructure.Services;

/// <summary>Renders the Telegram message for a post. Templates are Telegram-HTML written by the admin, with
/// {placeholders}; every placeholder VALUE is HTML-escaped, so post data can never inject markup. A template line
/// whose placeholders are all empty is dropped, so a missing "Vacancies" doesn't leave a dangling label.</summary>
public static class TelegramMessageRenderer
{
    public const int MessageLimit = 4096;
    public const int CaptionLimit = 1024;

    private static readonly Regex Tags = new("<[^>]*>", RegexOptions.Compiled);

    public static string DefaultTemplate(string category) => category switch
    {
        ContentCategories.Job =>
            "🆕 <b>{title}</b>\n\n🏢 {organization}\n👥 Vacancies: {vacancies}\n🎓 Qualification: {qualification}\n📍 {location}\n📅 Last date: <b>{last_date}</b>",
        ContentCategories.Result =>
            "📢 <b>{title}</b>\n\n🏢 {organization}\n📝 Exam: {exam}\n📅 Result date: <b>{result_date}</b>\n✂️ Cut-off: {cut_off}",
        ContentCategories.AdmitCard =>
            "🎫 <b>{title}</b>\n\n🏢 {organization}\n📝 Exam: {exam}\n📅 Released: {released}\n🗓 Exam date: <b>{exam_date}</b>",
        ContentCategories.Scheme =>
            "🏛 <b>{title}</b>\n\n🏢 {ministry}\n🎁 Benefits: {benefits}\n✅ Eligibility: {eligibility}",
        _ =>
            "📰 <b>{title}</b>\n\n{summary}\n\nSource: {source}",
    };

    public static string ButtonText(string category) => category switch
    {
        ContentCategories.Job => "View & Apply",
        ContentCategories.Result => "Check Result",
        ContentCategories.AdmitCard => "Download Admit Card",
        ContentCategories.Scheme => "Scheme Details",
        _ => "Read More",
    };

    public static string Escape(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    /// <summary>"Last date" -> "last_date". Lets a template reference any detail line by its label.</summary>
    public static string Key(string label) => SocialTemplate.Key(label);

    public static string Render(string category, string? customTemplate, string title, string url, IReadOnlyList<SocialDetail> details, bool asCaption)
    {
        var template = string.IsNullOrWhiteSpace(customTemplate) ? DefaultTemplate(category) : customTemplate;
        var cleaned = SocialTemplate.FillLines(template, SocialTemplate.Values(title, url, details), Escape);
        var limit = asCaption ? CaptionLimit : MessageLimit;

        while (cleaned.Count > 1 && string.Join('\n', cleaned).Length > limit) cleaned.RemoveAt(cleaned.Count - 1);
        var text = string.Join('\n', cleaned);
        if (text.Length > limit) text = Escape(title.Length > limit - 20 ? title[..(limit - 20)] : title); // last resort: never overflow
        return text;
    }

    /// <summary>Plain-text version used when Telegram rejects the HTML.</summary>
    public static string StripTags(string html) => System.Net.WebUtility.HtmlDecode(Tags.Replace(html, ""));
}
