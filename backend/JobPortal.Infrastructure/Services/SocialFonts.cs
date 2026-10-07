using JobPortal.Application.DTOs.Content;
using SkiaSharp;
using SkiaSharp.HarfBuzz;

namespace JobPortal.Infrastructure.Services;

/// <summary>Bundled fonts + mixed-script text drawing. Gujarati runs use Noto Sans Gujarati, everything else Noto Sans;
/// both are shaped with HarfBuzz so Gujarati conjuncts and vowel signs render correctly.</summary>
public static class SocialFonts
{
    private static readonly Lazy<SKTypeface[]> Faces = new(() => new[]
    {
        Load("NotoSans-Regular.ttf"), Load("NotoSans-Bold.ttf"),
        Load("NotoSansGujarati-Regular.ttf"), Load("NotoSansGujarati-Bold.ttf"),
    });

    private static SKTypeface Load(string file)
    {
        var asm = typeof(SocialFonts).Assembly;
        var name = asm.GetManifestResourceNames().First(n => n.EndsWith(file, StringComparison.OrdinalIgnoreCase));
        using var stream = asm.GetManifestResourceStream(name)!;
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return SKTypeface.FromData(SKData.CreateCopy(ms.ToArray()))
               ?? throw new InvalidOperationException($"Could not load font {file}.");
    }

    private static SKTypeface Latin(bool bold) => Faces.Value[bold ? 1 : 0];
    private static SKTypeface Gujarati(bool bold) => Faces.Value[bold ? 3 : 2];

    private static bool IsGujarati(char c) => c >= '઀' && c <= '૿';

    /// <summary>Splits text into runs of one script each. Neutral characters stay with the run they follow.</summary>
    public static List<(string Text, bool Gujarati)> Runs(string text)
    {
        var runs = new List<(string, bool)>();
        if (text.Length == 0) return runs;
        var current = new System.Text.StringBuilder();
        bool? script = null;
        foreach (var c in text)
        {
            var isG = IsGujarati(c);
            // Spaces and joiners ride along with the current run; digits and punctuation always use the Latin font
            // (the Gujarati font lacks reliable ASCII digit/punctuation glyphs).
            if (char.IsWhiteSpace(c) || c == (char)0x200C || c == (char)0x200D) { current.Append(c); continue; }
            if (script is null) script = isG;
            if (script != isG)
            {
                runs.Add((current.ToString(), script.Value));
                current.Clear();
                script = isG;
            }
            current.Append(c);
        }
        if (current.Length > 0) runs.Add((current.ToString(), script ?? false));
        return runs;
    }

    private static SKPaint PaintFor(bool gujarati, bool bold, float size, SKColor color) => new()
    {
        Typeface = gujarati ? Gujarati(bold) : Latin(bold),
        TextSize = size,
        Color = color,
        IsAntialias = true,
        SubpixelText = true,
    };

    public static float Measure(string text, float size, bool bold)
    {
        float total = 0;
        foreach (var (run, g) in Runs(text))
        {
            using var paint = PaintFor(g, bold, size, SKColors.Black);
            using var shaper = new SKShaper(paint.Typeface);
            total += shaper.Shape(run, paint).Width;
        }
        return total;
    }

    public static void Draw(SKCanvas canvas, string text, float x, float y, float size, SKColor color, bool bold)
    {
        foreach (var (run, g) in Runs(text))
        {
            using var paint = PaintFor(g, bold, size, color);
            using var shaper = new SKShaper(paint.Typeface);
            var shaped = shaper.Shape(run, paint);
            canvas.DrawShapedText(shaper, run, x, y, paint);
            x += shaped.Width;
        }
    }

    /// <summary>Greedy word wrap. A single word wider than the line is split by characters rather than overflowing.</summary>
    public static List<string> Wrap(string text, float size, float maxWidth, bool bold)
    {
        var lines = new List<string>();
        var current = "";
        foreach (var word in text.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var candidate = current.Length == 0 ? word : current + " " + word;
            if (Measure(candidate, size, bold) <= maxWidth) { current = candidate; continue; }
            if (current.Length > 0) { lines.Add(current); current = ""; }

            if (Measure(word, size, bold) <= maxWidth) { current = word; continue; }
            var piece = "";
            foreach (var ch in word)
            {
                if (piece.Length > 0 && Measure(piece + ch, size, bold) > maxWidth) { lines.Add(piece); piece = ""; }
                piece += ch;
            }
            current = piece;
        }
        if (current.Length > 0) lines.Add(current);
        return lines;
    }

    public static string Ellipsize(string text, float size, float maxWidth, bool bold)
    {
        if (Measure(text, size, bold) <= maxWidth) return text;
        var cut = text;
        while (cut.Length > 1 && Measure(cut + "…", size, bold) > maxWidth) cut = cut[..^1];
        return cut.TrimEnd() + "…";
    }
}
