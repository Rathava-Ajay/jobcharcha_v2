using System.Text;

namespace JobPortal.Application.Common;

/// <summary>
/// Minimal, dependency-free RFC4180-ish CSV reader/writer — this codebase had no CSV library
/// referenced anywhere, and the bulk import/export feature doesn't need more than quoted-field,
/// embedded-comma/newline handling. "Excel" support here means "opens correctly in Excel" (CSV
/// does); native .xlsx parsing would need a real library (ClosedXML/EPPlus) and is a bigger,
/// separate call than this first pass makes.
/// </summary>
public static class CsvUtil
{
    /// <summary>Parses CSV text into rows keyed by header (case-insensitive), in the file's row order.
    /// A header appearing more than once keeps the last value for that column, matching how most
    /// spreadsheet tools would produce/consume this shape.</summary>
    public static List<Dictionary<string, string>> Parse(string content)
    {
        var rawRows = ParseRows(content);
        if (rawRows.Count == 0) return new List<Dictionary<string, string>>();

        var headers = rawRows[0];
        var result = new List<Dictionary<string, string>>();
        for (var r = 1; r < rawRows.Count; r++)
        {
            var row = rawRows[r];
            if (row.Count == 1 && row[0].Length == 0) continue; // skip trailing blank line
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var c = 0; c < headers.Count; c++)
            {
                dict[headers[c].Trim()] = c < row.Count ? row[c] : "";
            }
            result.Add(dict);
        }
        return result;
    }

    private static List<List<string>> ParseRows(string content)
    {
        var rows = new List<List<string>>();
        var row = new List<string>();
        var field = new StringBuilder();
        var inQuotes = false;
        var i = 0;
        var n = content.Length;

        void EndField() { row.Add(field.ToString()); field.Clear(); }
        void EndRow() { EndField(); rows.Add(row); row = new List<string>(); }

        while (i < n)
        {
            var ch = content[i];
            if (inQuotes)
            {
                if (ch == '"')
                {
                    if (i + 1 < n && content[i + 1] == '"') { field.Append('"'); i += 2; continue; }
                    inQuotes = false; i++; continue;
                }
                field.Append(ch); i++; continue;
            }

            switch (ch)
            {
                case '"': inQuotes = true; i++; break;
                case ',': EndField(); i++; break;
                case '\r':
                    i++;
                    if (i < n && content[i] == '\n') i++;
                    EndRow();
                    break;
                case '\n': i++; EndRow(); break;
                default: field.Append(ch); i++; break;
            }
        }
        if (field.Length > 0 || row.Count > 0) EndRow();
        return rows;
    }

    public static string Write(IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<string?>> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", headers.Select(Escape)));
        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(",", row.Select(Escape)));
        }
        return sb.ToString();
    }

    private static string Escape(string? value)
    {
        value ??= "";
        return value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
    }
}
