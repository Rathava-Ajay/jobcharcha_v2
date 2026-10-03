using System.Text.RegularExpressions;

namespace JobPortal.Infrastructure.Services;

/// <summary>Cleans post data before it goes into any template: strips markup and control characters, collapses
/// whitespace, and bounds length. Channel-specific escaping (Telegram HTML) happens at render time on top of this.</summary>
public static class SocialText
{
    private static readonly Regex Tags = new("<[^>]*>", RegexOptions.Compiled);
    private static readonly Regex Control = new(@"[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮]", RegexOptions.Compiled);
    private static readonly Regex Space = new(@"\s+", RegexOptions.Compiled);

    public static string Clean(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var s = System.Net.WebUtility.HtmlDecode(Tags.Replace(value, " "));
        s = Tags.Replace(s, " "); // double-encoded markup like &lt;b&gt;
        s = Control.Replace(s, "");
        s = Space.Replace(s, " ").Trim();
        if (s.Length <= maxLength) return s;
        var cut = s[..Math.Max(0, maxLength - 1)];
        var lastSpace = cut.LastIndexOf(' ');
        return (lastSpace > maxLength / 2 ? cut[..lastSpace] : cut).TrimEnd() + "…";
    }

    public static string Date(DateTime? d) => d.HasValue ? d.Value.ToString("dd MMM yyyy", System.Globalization.CultureInfo.InvariantCulture) : "";
}
