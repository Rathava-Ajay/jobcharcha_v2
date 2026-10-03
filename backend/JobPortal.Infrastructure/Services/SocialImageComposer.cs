using System.Reflection;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Social;
using SkiaSharp;
using SkiaSharp.HarfBuzz;

namespace JobPortal.Infrastructure.Services;

public record SocialImageRequest(
    string Category,
    string Title,
    IReadOnlyList<SocialDetail> Details,
    string Size,                 // "square" (1080x1080) or "portrait" (1080x1350)
    string? BrandColor,
    string? AccentColor,
    byte[]? Background,          // AI background; null => branded gradient template
    byte[]? Logo,                // null => wordmark text
    string SiteName,
    string Domain);

/// <summary>Draws the final share image. The AI model only supplies a text-free background; every word on the image
/// is drawn here with bundled Noto fonts (Latin + Gujarati, shaped with HarfBuzz) so spelling is always exact.</summary>
public static class SocialImageComposer
{
    public const int Width = 1080;
    private const int Margin = 72;

    public static int HeightFor(string? size) => string.Equals(size, "portrait", StringComparison.OrdinalIgnoreCase) ? 1350 : 1080;

    public static byte[] Compose(SocialImageRequest r)
    {
        var height = HeightFor(r.Size);
        var brand = ParseColor(r.BrandColor, new SKColor(0x1D, 0x4E, 0xD8));
        var accent = ParseColor(r.AccentColor, new SKColor(0xF5, 0x9E, 0x0B));

        using var surface = SKSurface.Create(new SKImageInfo(Width, height, SKColorType.Rgba8888, SKAlphaType.Opaque));
        var canvas = surface.Canvas;

        DrawBackground(canvas, height, brand, accent, r.Background);

        // ---- top bar: logo / wordmark on the left, category badge on the right ----
        var top = Margin;
        var badgeText = BadgeFor(r.Category);
        var badgeSize = 32f;
        var badgeW = SocialFonts.Measure(badgeText, badgeSize, bold: true) + 56;
        var badgeRect = new SKRect(Width - Margin - badgeW, top, Width - Margin, top + 64);
        using (var fill = new SKPaint { Color = accent, IsAntialias = true })
            canvas.DrawRoundRect(badgeRect, 32, 32, fill);
        SocialFonts.Draw(canvas, badgeText, badgeRect.Left + 28, badgeRect.Top + 44, badgeSize, ReadableOn(accent), bold: true);

        var topBarBottom = top + 64;
        if (r.Logo is { Length: > 0 } && TryDrawLogo(canvas, r.Logo, Margin, top, maxW: 360, maxH: 64)) { }
        else SocialFonts.Draw(canvas, r.SiteName, Margin, top + 46, 46, SKColors.White, bold: true);

        // ---- detail card (bottom) ----
        var rows = r.Details.Where(d => d.Value.Length > 0).Take(4).ToList();
        const float footerH = 92;
        var rowH = 84f;
        var cardH = rows.Count == 0 ? 0 : rows.Count * rowH + 40;
        var cardTop = height - footerH - cardH - (cardH > 0 ? 24 : 0);

        if (rows.Count > 0)
        {
            var card = new SKRect(Margin, cardTop, Width - Margin, cardTop + cardH);
            using (var cardPaint = new SKPaint { Color = new SKColor(255, 255, 255, 236), IsAntialias = true })
                canvas.DrawRoundRect(card, 28, 28, cardPaint);
            using (var bar = new SKPaint { Color = accent, IsAntialias = true })
                canvas.DrawRoundRect(new SKRect(card.Left, card.Top + 20, card.Left + 10, card.Bottom - 20), 5, 5, bar);

            var y = card.Top + 20;
            var valueMax = card.Width - 60;
            foreach (var d in rows)
            {
                SocialFonts.Draw(canvas, d.Label.ToUpperInvariant(), card.Left + 40, y + 26, 22, new SKColor(0x64, 0x74, 0x8B), bold: true);
                var value = SocialFonts.Ellipsize(d.Value, 34, valueMax, bold: true);
                SocialFonts.Draw(canvas, value, card.Left + 40, y + 62, 34, new SKColor(0x0F, 0x17, 0x2A), bold: true);
                y += rowH;
            }
        }

        // ---- title (fills the space between the top bar and the card) ----
        var titleTop = topBarBottom + 56;
        var titleBottom = (cardH > 0 ? cardTop : height - footerH) - 36;
        DrawTitle(canvas, r.Title, titleTop, titleBottom);

        // ---- footer ----
        using (var line = new SKPaint { Color = accent, IsAntialias = true })
            canvas.DrawRoundRect(new SKRect(Margin, height - footerH + 8, Margin + 96, height - footerH + 14), 3, 3, line);
        SocialFonts.Draw(canvas, r.Domain, Margin, height - 34, 34, SKColors.White, bold: true);

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 88);
        return data.ToArray();
    }

    private static void DrawBackground(SKCanvas canvas, int height, SKColor brand, SKColor accent, byte[]? background)
    {
        var full = new SKRect(0, 0, Width, height);
        SKBitmap? bmp = null;
        if (background is { Length: > 0 })
        {
            try { bmp = SKBitmap.Decode(background); } catch { bmp = null; }
        }

        if (bmp is not null)
        {
            using (bmp)
            {
                // "cover": scale to fill, centre-crop.
                var scale = Math.Max((float)Width / bmp.Width, (float)height / bmp.Height);
                var w = bmp.Width * scale;
                var h = bmp.Height * scale;
                var dst = new SKRect((Width - w) / 2, (height - h) / 2, (Width + w) / 2, (height + h) / 2);
                using var paint = new SKPaint { IsAntialias = true, FilterQuality = SKFilterQuality.High };
                canvas.DrawBitmap(bmp, dst, paint);
            }
            // Brand tint + darkening so white text stays readable on any generated picture.
            using var tint = new SKPaint
            {
                Shader = SKShader.CreateLinearGradient(new SKPoint(0, 0), new SKPoint(0, height),
                    new[] { brand.WithAlpha(150), new SKColor(0, 0, 0, 175) }, null, SKShaderTileMode.Clamp),
            };
            canvas.DrawRect(full, tint);
            return;
        }

        // Default template: branded gradient with soft accent shapes (used when AI is off, capped or failing).
        var dark = new SKColor((byte)(brand.Red * 0.45), (byte)(brand.Green * 0.45), (byte)(brand.Blue * 0.55));
        using (var grad = new SKPaint
        {
            Shader = SKShader.CreateLinearGradient(new SKPoint(0, 0), new SKPoint(Width, height),
                new[] { brand, dark }, null, SKShaderTileMode.Clamp),
        })
            canvas.DrawRect(full, grad);

        using var shape = new SKPaint { Color = accent.WithAlpha(34), IsAntialias = true };
        canvas.DrawCircle(Width * 0.92f, height * 0.12f, 340, shape);
        canvas.DrawCircle(Width * 0.05f, height * 0.62f, 260, shape);
        using var shape2 = new SKPaint { Color = SKColors.White.WithAlpha(16), IsAntialias = true };
        canvas.DrawCircle(Width * 0.75f, height * 0.78f, 220, shape2);
    }

    private static void DrawTitle(SKCanvas canvas, string title, float top, float bottom)
    {
        var maxWidth = Width - Margin * 2;
        var available = bottom - top;
        var text = title.Trim();

        for (var size = 88f; size >= 40f; size -= 4f)
        {
            var lineH = size * 1.28f;
            var maxLines = (int)Math.Floor(available / lineH);
            if (maxLines < 1) continue;
            var lines = SocialFonts.Wrap(text, size, maxWidth, bold: true);
            if (lines.Count <= maxLines || size <= 40f)
            {
                if (lines.Count > maxLines)
                {
                    lines = lines.Take(maxLines).ToList();
                    lines[^1] = SocialFonts.Ellipsize(lines[^1] + " …", size, maxWidth, bold: true);
                }
                var y = top + size;
                foreach (var line in lines)
                {
                    SocialFonts.Draw(canvas, line, Margin, y, size, SKColors.White, bold: true);
                    y += lineH;
                }
                return;
            }
        }
    }

    private static bool TryDrawLogo(SKCanvas canvas, byte[] logo, float x, float y, float maxW, float maxH)
    {
        try
        {
            using var bmp = SKBitmap.Decode(logo);
            if (bmp is null || bmp.Width == 0) return false;
            var scale = Math.Min(maxW / bmp.Width, maxH / bmp.Height);
            var w = bmp.Width * scale;
            var h = bmp.Height * scale;
            using var paint = new SKPaint { IsAntialias = true, FilterQuality = SKFilterQuality.High };
            canvas.DrawBitmap(bmp, new SKRect(x, y + (maxH - h) / 2, x + w, y + (maxH - h) / 2 + h), paint);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static string BadgeFor(string category) => category switch
    {
        ContentCategories.Job => "NEW JOB",
        ContentCategories.Result => "RESULT OUT",
        ContentCategories.AdmitCard => "ADMIT CARD",
        ContentCategories.Scheme => "GOVT SCHEME",
        _ => "NEWS",
    };

    public static SKColor ParseColor(string? value, SKColor fallback) =>
        !string.IsNullOrWhiteSpace(value) && SKColor.TryParse(value.Trim(), out var c) ? c.WithAlpha(255) : fallback;

    private static SKColor ReadableOn(SKColor bg)
    {
        var lum = (0.299 * bg.Red + 0.587 * bg.Green + 0.114 * bg.Blue) / 255.0;
        return lum > 0.6 ? new SKColor(0x0F, 0x17, 0x2A) : SKColors.White;
    }
}

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
