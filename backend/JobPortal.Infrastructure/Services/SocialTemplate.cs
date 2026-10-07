using System.Text.RegularExpressions;
using JobPortal.Application.DTOs.Social;

namespace JobPortal.Infrastructure.Services;

/// <summary>Shared {placeholder} engine for the Telegram message and the Facebook/Instagram caption templates.
/// Values are passed through a caller-supplied escape function; a line whose placeholders are all empty is
/// dropped; runs of blank lines collapse.</summary>
public static class SocialTemplate
{
    private static readonly Regex Placeholder = new(@"\{([a-z_]+)\}", RegexOptions.Compiled);

    /// <summary>"Last date" -> "last_date". Lets a template reference any detail line by its label.</summary>
    public static string Key(string label) => Regex.Replace(label.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "_").Trim('_');

    public static Dictionary<string, string> Values(string title, string url, IReadOnlyList<SocialDetail> details)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal) { ["title"] = title, ["url"] = url };
        foreach (var d in details) values.TryAdd(Key(d.Label), d.Value);
        return values;
    }

    public static List<string> FillLines(string template, IReadOnlyDictionary<string, string> values, Func<string, string> escape)
    {
        var lines = new List<string>();
        foreach (var raw in template.Replace("\r\n", "\n").Split('\n'))
        {
            if (raw.Length == 0) { lines.Add(""); continue; }
            var hadToken = Placeholder.IsMatch(raw);
            var anyValue = false;
            var line = Placeholder.Replace(raw, m =>
            {
                if (values.TryGetValue(m.Groups[1].Value, out var v) && v.Length > 0) { anyValue = true; return escape(v); }
                return "";
            });
            if (hadToken && !anyValue) continue;      // every placeholder on this line was empty
            lines.Add(line);
        }

        var cleaned = new List<string>();
        foreach (var l in lines)
        {
            if (l.Length == 0 && (cleaned.Count == 0 || cleaned[^1].Length == 0)) continue;
            cleaned.Add(l);
        }
        while (cleaned.Count > 0 && cleaned[^1].Length == 0) cleaned.RemoveAt(cleaned.Count - 1);
        return cleaned;
    }
}
