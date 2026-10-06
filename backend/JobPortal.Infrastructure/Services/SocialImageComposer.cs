using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Social;
using SkiaSharp;

namespace JobPortal.Infrastructure.Services;

public record SocialImageRequest(
    string Category,
    string Title,
    IReadOnlyList<SocialDetail> Details,
    string Size,                 // "portrait" (1080x1350, the Instagram 4:5 feed size) or "square" (1080x1080)
    string? BrandColor,          // optional: re-colours the template's main colour (leave empty to use the template as designed)
    string? AccentColor,         // optional: re-colours the template's accent
    byte[]? Background,          // AI hero picture; null => soft branded sky
    byte[]? Logo,                // organisation / site logo; null => none
    string SiteName,
    string Domain,
    int Template = 0);           // 0-5: which of the six colour templates (see SocialThemes); posts rotate through them

/// <summary>Draws the final share image in the look of the @jobcharcha_official recruitment posts: a bright hero picture with a
/// tricolour corner, a navy "RECRUITMENT NOTICE" banner, a title panel, information cards and a last-date bar. The AI model only
/// supplies the text-free hero picture; every word is drawn here with bundled Noto fonts (Latin + Gujarati, HarfBuzz-shaped), so
/// spelling is always exact.</summary>
public static class SocialImageComposer
{
    public const int Width = 1080;
    private const float Margin = 40;

    private static readonly SKColor Saffron = new(0xFF, 0x99, 0x33);
    private static readonly SKColor Green = new(0x13, 0x88, 0x08);

    public static int HeightFor(string? size) => string.Equals(size, "square", StringComparison.OrdinalIgnoreCase) ? 1080 : 1350;

    public static byte[] Compose(SocialImageRequest r)
    {
        var h = HeightFor(r.Size);
        // Colour template: the post's slot in the rotation, optionally re-coloured by the category's own brand colours.
        SKColor? customBrand = !string.IsNullOrWhiteSpace(r.BrandColor) && SKColor.TryParse(r.BrandColor.Trim(), out var bc) ? bc.WithAlpha(255) : null;
        SKColor? customAccent = !string.IsNullOrWhiteSpace(r.AccentColor) && SKColor.TryParse(r.AccentColor.Trim(), out var ac) ? ac.WithAlpha(255) : null;
        var th = SocialTheme.For(r.Template).WithBrand(customBrand, customAccent);

        using var surface = SKSurface.Create(new SKImageInfo(Width, h, SKColorType.Rgba8888, SKAlphaType.Opaque));
        var c = surface.Canvas;
        c.Clear(th.Page);

        // ---- vertical rhythm (fractions of the height so square and portrait both fit) ----
        var heroH = h * 0.215f;
        var gap = h * 0.014f;
        var bannerTop = heroH - h * 0.02f;
        var bannerH = h * 0.085f;
        var titleTop = bannerTop + bannerH + gap;
        var titleH = h * 0.16f;
        var gridTop = titleTop + titleH + gap;
        var footerH = h * 0.052f;
        var footerTop = h - footerH - h * 0.014f;
        var dateH = h * 0.07f;
        var dateTop = footerTop - gap - dateH;

        // The key date (last date / result date / exam date) gets its own bar; the rest become cards.
        var all = r.Details.Where(d => d.Value.Length > 0).ToList();
        var keyDate = all.FirstOrDefault(d => d.Label.Contains("date", StringComparison.OrdinalIgnoreCase) || d.Label.Equals("Released", StringComparison.OrdinalIgnoreCase));
        var orgDetail = all.FirstOrDefault(d => d.Label is "Organization" or "Ministry");   // already shown in the header
        var cards = all.Where(d => d != keyDate && d != orgDetail).Take(h > 1100 ? 6 : 4).ToList();   // portrait has room for three rows
        if (keyDate is null) dateTop = footerTop;           // no bar: let the cards use its space

        DrawHero(c, h, heroH, r.Background, th);
        var orgLine = orgDetail?.Value;
        DrawOrgHeader(c, heroH, orgLine, r.SiteName, r.Logo, th);
        DrawBanner(c, bannerTop, bannerH, BannerFor(r.Category), th);
        DrawTitlePanel(c, titleTop, titleH, r.Title, r.Category, th);
        DrawCards(c, gridTop, dateTop - gap, cards, th);
        if (keyDate is not null) DrawDateBar(c, dateTop, dateH, keyDate, th);
        DrawFooter(c, footerTop, footerH, r.Domain, th);
        DrawWatermark(c, gridTop, dateTop, th);

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 90);
        return data.ToArray();
    }

    // ================================================================================================
    // Sections
    // ================================================================================================

    private static void DrawHero(SKCanvas c, int h, float heroH, byte[]? background, SocialTheme th)
    {
        var hero = new SKRect(0, 0, Width, heroH);
        SKBitmap? bmp = null;
        if (background is { Length: > 0 })
        {
            try { bmp = SKBitmap.Decode(background); } catch { bmp = null; }
        }

        if (bmp is not null)
        {
            using (bmp)
            {
                // "cover" the hero strip, keeping the upper-middle of the picture (where the subject usually is).
                var scale = Math.Max(Width / (float)bmp.Width, heroH / (float)bmp.Height);
                var w = bmp.Width * scale;
                var ph = bmp.Height * scale;
                var dst = new SKRect((Width - w) / 2, -(ph - heroH) * 0.3f, (Width + w) / 2, -(ph - heroH) * 0.3f + ph);
                c.Save();
                c.ClipRect(hero);
                using var p = new SKPaint { IsAntialias = true, FilterQuality = SKFilterQuality.High };
                c.DrawBitmap(bmp, dst, p);
                c.Restore();
            }
        }
        else
        {
            // No AI picture: a soft sky with a few light shapes.
            using var sky = new SKPaint { Shader = SKShader.CreateLinearGradient(new SKPoint(0, 0), new SKPoint(0, heroH), new[] { th.SkyTop, th.Page }, null, SKShaderTileMode.Clamp) };
            c.DrawRect(hero, sky);
            using var cloud = new SKPaint { Color = SKColors.White.WithAlpha((byte)(th.Wash == SKColors.White ? 150 : 28)), IsAntialias = true };
            c.DrawCircle(Width * 0.78f, heroH * 0.35f, heroH * 0.32f, cloud);
            c.DrawCircle(Width * 0.9f, heroH * 0.5f, heroH * 0.24f, cloud);
            c.DrawCircle(Width * 0.62f, heroH * 0.55f, heroH * 0.2f, cloud);
        }

        // White wash so the dark text on top stays readable on any picture, melting into the page colour below.
        using (var wash = new SKPaint
        {
            Shader = SKShader.CreateLinearGradient(new SKPoint(0, 0), new SKPoint(0, heroH),
                new[] { th.Wash.WithAlpha(120), th.Wash.WithAlpha(185), th.Page }, new[] { 0f, 0.55f, 1f }, SKShaderTileMode.Clamp),
        })
            c.DrawRect(hero, wash);

        DrawTricolourCorner(c, topLeft: true, 190);
        DrawTricolourCorner(c, topLeft: false, 120, bottom: h);
    }

    /// <summary>Saffron / white / green diagonal bands in a corner, like the corner swoosh on the account's posts.</summary>
    private static void DrawTricolourCorner(SKCanvas c, bool topLeft, float size, float bottom = 0)
    {
        void Band(SKColor color, float from, float to)
        {
            using var path = new SKPath();
            if (topLeft)
            {
                path.MoveTo(from, 0); path.LineTo(to, 0); path.LineTo(0, to); path.LineTo(0, from); path.Close();
            }
            else
            {
                var x = Width; var y = bottom;
                path.MoveTo(x - from, y); path.LineTo(x - to, y); path.LineTo(x, y - to); path.LineTo(x, y - from); path.Close();
            }
            using var p = new SKPaint { Color = color, IsAntialias = true };
            c.DrawPath(path, p);
        }
        var t = size / 3f;
        Band(topLeft ? Saffron : Green, 0, t * 0.75f);
        Band(SKColors.White, t * 0.75f, t * 1.15f);
        Band(topLeft ? Green : Saffron, t * 1.15f, t * 1.9f);
    }

    private static void DrawOrgHeader(SKCanvas c, float heroH, string? org, string siteName, byte[]? logo, SocialTheme th)
    {
        var text = string.IsNullOrWhiteSpace(org) ? siteName : org!;
        var maxW = Width - 2 * (logo is { Length: > 0 } ? 235f : 210f);   // keep clear of the tricolour corner and the logo
        var lines = SocialFonts.Wrap(text, 46, maxW, bold: true);
        var size = 46f;
        for (; size >= 28 && lines.Count > 2; size -= 3) lines = SocialFonts.Wrap(text, size, maxW, bold: true);
        if (lines.Count > 2) lines = new List<string> { lines[0], SocialFonts.Ellipsize(string.Join(' ', lines.Skip(1)), size, maxW, bold: true) };

        var lineH = size * 1.2f;
        var blockH = lines.Count * lineH;
        var top = heroH * 0.30f - blockH / 2 + size * 0.2f;

        if (logo is { Length: > 0 })
        {
            var box = new SKRect(Width - Margin - 124, 26, Width - Margin, 26 + 124);
            using var white = new SKPaint { Color = SKColors.White, IsAntialias = true };
            c.DrawRoundRect(box, 18, 18, white);
            DrawLogo(c, logo, box.MidX, box.MidY, 104, 104);
        }

        var y = top + size;
        foreach (var line in lines)
        {
            var w = SocialFonts.Measure(line, size, bold: true);
            SocialFonts.Draw(c, line, (Width - w) / 2, y, size, th.OrgText, bold: true);
            y += lineH;
        }

        // Orange - green rule under the name, as on the account's headers.
        var ruleY = y - lineH * 0.25f + 4;
        using var o = new SKPaint { Color = th.Rule, IsAntialias = true };
        using var g = new SKPaint { Color = Green, IsAntialias = true };
        c.DrawRoundRect(new SKRect(Width / 2f - 150, ruleY, Width / 2f - 6, ruleY + 5), 2.5f, 2.5f, o);
        c.DrawRoundRect(new SKRect(Width / 2f + 6, ruleY, Width / 2f + 150, ruleY + 5), 2.5f, 2.5f, g);
    }

    private static bool DrawLogo(SKCanvas c, byte[] logo, float cx, float cy, float maxW, float maxH)
    {
        try
        {
            using var bmp = SKBitmap.Decode(logo);
            if (bmp is null || bmp.Width == 0) return false;
            var scale = Math.Min(maxW / bmp.Width, maxH / bmp.Height);
            var w = bmp.Width * scale; var hh = bmp.Height * scale;
            using var p = new SKPaint { IsAntialias = true, FilterQuality = SKFilterQuality.High };
            c.DrawBitmap(bmp, new SKRect(cx - w / 2, cy - hh / 2, cx + w / 2, cy + hh / 2), p);
            return true;
        }
        catch { return false; }
    }

    private static void DrawBanner(SKCanvas c, float top, float height, string text, SocialTheme th)
    {
        var rect = new SKRect(Margin, top, Width - Margin, top + height);
        using (var shadow = new SKPaint { Color = new SKColor(0, 0, 0, 40), IsAntialias = true, MaskFilter = SKMaskFilter.CreateBlur(SKBlurStyle.Normal, 8) })
            c.DrawRoundRect(new SKRect(rect.Left, rect.Top + 5, rect.Right, rect.Bottom + 5), 22, 22, shadow);
        using (var fill = new SKPaint { Color = th.BannerFill, IsAntialias = true })
            c.DrawRoundRect(rect, 22, 22, fill);

        // Last word in yellow: "RECRUITMENT NOTICE" -> NOTICE.
        var words = text.Split(' ');
        var head = string.Join(' ', words.Take(words.Length - 1));
        var tail = words[^1];
        var size = height * 0.62f;
        float W(float s) => SocialFonts.Measure(head.Length > 0 ? head + " " : "", s, true) + SocialFonts.Measure(tail, s, true);
        while (size > 24 && W(size) > rect.Width - 60) size -= 2;
        var x = rect.Left + (rect.Width - W(size)) / 2;
        var baseline = rect.Top + height / 2 + size * 0.36f;
        if (head.Length > 0)
        {
            SocialFonts.Draw(c, head + " ", x, baseline, size, th.BannerText, bold: true);
            x += SocialFonts.Measure(head + " ", size, true);
        }
        SocialFonts.Draw(c, tail, x, baseline, size, th.BannerTail, bold: true);
        using var rule = new SKPaint { Color = th.BannerTail, IsAntialias = true };
        c.DrawRoundRect(new SKRect(rect.Left + rect.Width * 0.3f, rect.Bottom - 12, rect.Left + rect.Width * 0.7f, rect.Bottom - 8), 2, 2, rule);
    }

    private static void DrawTitlePanel(SKCanvas c, float top, float height, string title, string category, SocialTheme th)
    {
        var rect = new SKRect(Margin, top, Width - Margin, top + height);
        using (var fill = new SKPaint { Color = th.PanelBg, IsAntialias = true })
            c.DrawRoundRect(rect, 24, 24, fill);

        // Round icon badge on the left.
        var r = Math.Min(height * 0.30f, 64f);
        var cx = rect.Left + 28 + r;
        var cy = rect.MidY;
        using (var badge = new SKPaint { Color = th.TitleBadge, IsAntialias = true })
            c.DrawCircle(cx, cy, r, badge);
        DrawIcon(c, IconForCategory(category), cx, cy, r * 0.55f, SKColors.White);
        using (var sep = new SKPaint { Color = th.TitleText.WithAlpha(90), IsAntialias = true })
            c.DrawRect(cx + r + 18, rect.Top + 24, 2.5f, rect.Height - 48, sep);

        var textLeft = cx + r + 36;
        var maxW = rect.Right - 24 - textLeft;
        var maxH = rect.Height - 28;

        // "Main part - highlighted part": the part after a dash is shown in orange, as the account does.
        var (main, highlight) = SplitTitle(title);
        float size = 62;
        List<string> mainLines = new(), hiLines = new();
        for (; size >= 26; size -= 2)
        {
            mainLines = main.Length > 0 ? SocialFonts.Wrap(main, size, maxW, true) : new();
            hiLines = highlight.Length > 0 ? SocialFonts.Wrap(highlight, size, maxW, true) : new();
            if ((mainLines.Count + hiLines.Count) * size * 1.18f <= maxH) break;
        }
        var all = mainLines.Concat(hiLines).ToList();
        var lineH = size * 1.18f;
        if (all.Count * lineH > maxH)
        {
            var keep = Math.Max(1, (int)(maxH / lineH));
            all = all.Take(keep).ToList();
            all[^1] = SocialFonts.Ellipsize(all[^1] + " …", size, maxW, true);
            mainLines = mainLines.Take(Math.Min(mainLines.Count, keep)).ToList();
        }
        var y = rect.MidY - all.Count * lineH / 2 + size * 0.95f;
        for (var i = 0; i < all.Count; i++)
        {
            SocialFonts.Draw(c, all[i], textLeft, y, size, i < mainLines.Count ? th.TitleText : th.TitleTail, bold: true);
            y += lineH;
        }
    }

    /// <summary>Splits "GSSSB Clerk Recruitment 2026 - 6843 Posts" at the last dash so the tail can be highlighted.</summary>
    public static (string Main, string Highlight) SplitTitle(string title)
    {
        var t = title.Trim();
        foreach (var sep in new[] { " – ", " — ", " - ", ": ", ", " })
        {
            var i = t.LastIndexOf(sep, StringComparison.Ordinal);
            if (i > 8 && i < t.Length - sep.Length - 3)
            {
                var main = t[..i].Trim();
                return (sep is ": " or ", " ? main + sep.Trim() : main, t[(i + sep.Length)..].Trim());
            }
        }
        return (t, "");
    }

    private static void DrawCards(SKCanvas c, float top, float bottom, List<SocialDetail> cards, SocialTheme th)
    {
        if (cards.Count == 0) return;
        const float colGap = 18;
        var cols = cards.Count == 1 ? 1 : 2;
        var rows = (int)Math.Ceiling(cards.Count / (double)cols);
        var rowGap = 16f;
        var cardH = Math.Min(230f, (bottom - top - (rows - 1) * rowGap) / rows);
        var cardW = (Width - 2 * Margin - (cols - 1) * colGap) / cols;

        for (var i = 0; i < cards.Count; i++)
        {
            var col = i % cols; var row = i / cols;
            var x = Margin + col * (cardW + colGap);
            var y = top + row * (cardH + rowGap);
            var span = cols == 2 && i == cards.Count - 1 && cards.Count % 2 == 1;      // a lone last card uses the full width
            DrawCard(c, new SKRect(x, y, span ? Width - Margin : x + cardW, y + cardH), cards[i], th);
        }
    }

    private static void DrawCard(SKCanvas c, SKRect rect, SocialDetail d, SocialTheme th)
    {
        var headH = Math.Min(62f, rect.Height * 0.34f);
        using (var body = new SKPaint { Color = th.CardBody, IsAntialias = true })
            c.DrawRoundRect(rect, 20, 20, body);

        // Navy header strip with icon + caps label.
        c.Save();
        using var clip = new SKPath();
        clip.AddRoundRect(rect, 20, 20);
        c.ClipPath(clip, antialias: true);
        using (var head = new SKPaint { Color = th.CardHead, IsAntialias = true })
            c.DrawRect(new SKRect(rect.Left, rect.Top, rect.Right, rect.Top + headH), head);
        c.Restore();

        var ir = headH * 0.36f;
        using (var ib = new SKPaint { Color = th.IconFill, IsAntialias = true })
            c.DrawCircle(rect.Left + 20 + ir, rect.Top + headH / 2, ir, ib);
        DrawIcon(c, IconForLabel(d.Label), rect.Left + 20 + ir, rect.Top + headH / 2, ir * 0.6f, SKColors.White);
        var labelSize = Math.Min(30f, headH * 0.5f);
        var label = SocialFonts.Ellipsize(d.Label.ToUpperInvariant(), labelSize, rect.Width - 40 - ir * 2 - 16, true);
        SocialFonts.Draw(c, label, rect.Left + 20 + ir * 2 + 14, rect.Top + headH / 2 + labelSize * 0.36f, labelSize, th.CardLabel, bold: true);

        // Value: as large as fits in the body.
        var bodyTop = rect.Top + headH;
        var maxW = rect.Width - 36;
        var maxH = rect.Height - headH - 20;
        float size = 44;
        List<string> lines = new();
        for (; size >= 20; size -= 2)
        {
            lines = SocialFonts.Wrap(d.Value, size, maxW, true);
            if (lines.Count * size * 1.2f <= maxH) break;
        }
        var lineH = size * 1.2f;
        var maxLines = Math.Max(1, (int)(maxH / lineH));
        if (lines.Count > maxLines)
        {
            lines = lines.Take(maxLines).ToList();
            lines[^1] = SocialFonts.Ellipsize(lines[^1] + " …", size, maxW, true);
        }
        var y = bodyTop + 10 + (maxH - lines.Count * lineH) / 2 + size * 0.95f;
        foreach (var line in lines)
        {
            SocialFonts.Draw(c, line, rect.Left + 18, y, size, th.CardText, bold: true);
            y += lineH;
        }
    }

    private static void DrawDateBar(SKCanvas c, float top, float height, SocialDetail d, SocialTheme th)
    {
        var rect = new SKRect(Margin, top, Width - Margin, top + height);
        using (var bg = new SKPaint { Color = th.DateBg, IsAntialias = true })
            c.DrawRoundRect(rect, 20, 20, bg);

        var leftW = Math.Min(rect.Width * 0.42f, 400f);
        var left = new SKRect(rect.Left, rect.Top, rect.Left + leftW, rect.Bottom);
        using (var nb = new SKPaint { Color = th.DateLeft, IsAntialias = true })
            c.DrawRoundRect(left, 20, 20, nb);

        var ir = height * 0.3f;
        using (var ring = new SKPaint { Color = SKColors.White, IsAntialias = true, Style = SKPaintStyle.Stroke, StrokeWidth = 3 })
            c.DrawCircle(left.Left + 22 + ir, left.MidY, ir, ring);
        DrawIcon(c, "calendar", left.Left + 22 + ir, left.MidY, ir * 0.55f, SKColors.White);

        var labelSize = height * 0.4f;
        var label = SocialFonts.Ellipsize(d.Label.ToUpperInvariant(), labelSize, leftW - ir * 2 - 56, true);
        SocialFonts.Draw(c, label, left.Left + 22 + ir * 2 + 16, left.MidY + labelSize * 0.36f, labelSize, th.DateLabel, bold: true);

        var maxW = rect.Right - left.Right - 36;
        var size = height * 0.5f;
        while (size > 20 && SocialFonts.Measure(d.Value, size, true) > maxW) size -= 2;
        var value = SocialFonts.Ellipsize(d.Value, size, maxW, true);
        SocialFonts.Draw(c, value, left.Right + 22, rect.MidY + size * 0.36f, size, th.DateText, bold: true);
    }

    private static readonly Lazy<SKBitmap?> WatermarkLogo = new(() =>
    {
        try
        {
            var asm = typeof(SocialImageComposer).Assembly;
            var name = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith("jobcharcha_watermark.png", StringComparison.OrdinalIgnoreCase));
            if (name is null) return null;
            using var stream = asm.GetManifestResourceStream(name)!;
            return SKBitmap.Decode(stream);
        }
        catch { return null; }
    });

    /// <summary>A large, very light, slightly tilted JobCharcha logo across the details area, so a re-shared screenshot still says where it came from.</summary>
    private static void DrawWatermark(SKCanvas c, float top, float bottom, SocialTheme th)
    {
        var logo = WatermarkLogo.Value;
        if (logo is null) return;
        var w = Width * 0.82f;
        var lh = w * logo.Height / logo.Width;
        c.Save();
        c.Translate(Width / 2f, (top + bottom) / 2f);
        c.RotateDegrees(-18);
        // The logo is tinted with the theme colour (white on the dark theme) at ~14% opacity.
        var tint = (th.Wash == SKColors.White ? th.OrgText : SKColors.White).WithAlpha(36);
        using var p = new SKPaint { IsAntialias = true, FilterQuality = SKFilterQuality.High, ColorFilter = SKColorFilter.CreateBlendMode(tint, SKBlendMode.SrcIn) };
        c.DrawBitmap(logo, new SKRect(-w / 2, -lh / 2, w / 2, lh / 2), p);
        c.Restore();
    }

    private static void DrawFooter(SKCanvas c, float top, float height, string domain, SocialTheme th)
    {
        var rect = new SKRect(Margin, top, Width - Margin, top + height);
        using (var bg = new SKPaint { Color = th.FooterFill, IsAntialias = true })
            c.DrawRoundRect(rect, height / 2, height / 2, bg);
        var size = height * 0.46f;
        const string lead = "Full details & apply link:";
        var leadW = SocialFonts.Measure(lead, size, false);
        var domW = SocialFonts.Measure(domain, size, true);
        var x = rect.Left + (rect.Width - leadW - 12 - domW) / 2;
        var y = rect.MidY + size * 0.36f;
        SocialFonts.Draw(c, lead, x, y, size, th.FooterText, bold: false);
        SocialFonts.Draw(c, domain, x + leadW + 12, y, size, th.FooterDomain, bold: true);
    }

    // ================================================================================================
    // Icons (simple vector shapes, so no emoji font is needed)
    // ================================================================================================

    private static string IconForCategory(string category) => category switch
    {
        ContentCategories.Job => "people",
        ContentCategories.Result => "doc",
        ContentCategories.AdmitCard => "doc",
        ContentCategories.Scheme => "building",
        _ => "news",
    };

    private static string IconForLabel(string label)
    {
        var l = label.ToLowerInvariant();
        if (l.Contains("vacanc") || l.Contains("post")) return "people";
        if (l.Contains("qualif") || l.Contains("eligib")) return "cap";
        if (l.Contains("locat") || l.Contains("state")) return "pin";
        if (l.Contains("date") || l.Contains("releas")) return "calendar";
        if (l.Contains("organ") || l.Contains("ministry") || l.Contains("source")) return "building";
        if (l.Contains("benefit") || l.Contains("cut") || l.Contains("salary") || l.Contains("fee")) return "rupee";
        return "doc";
    }

    /// <summary>Draws a simple glyph centred at (cx, cy) that fits a box of roughly 2r x 2r.</summary>
    private static void DrawIcon(SKCanvas c, string kind, float cx, float cy, float r, SKColor color)
    {
        using var fill = new SKPaint { Color = color, IsAntialias = true };
        using var line = new SKPaint { Color = color, IsAntialias = true, Style = SKPaintStyle.Stroke, StrokeWidth = Math.Max(2f, r * 0.16f), StrokeCap = SKStrokeCap.Round, StrokeJoin = SKStrokeJoin.Round };

        switch (kind)
        {
            case "people":
                c.DrawCircle(cx, cy - r * 0.38f, r * 0.34f, fill);
                using (var body = new SKPath())
                {
                    body.AddArc(new SKRect(cx - r * 0.8f, cy + r * 0.05f, cx + r * 0.8f, cy + r * 1.5f), 180, 180);
                    body.Close();
                    c.DrawPath(body, fill);
                }
                break;
            case "cap":
                using (var cap = new SKPath())
                {
                    cap.MoveTo(cx, cy - r * 0.75f); cap.LineTo(cx + r, cy - r * 0.2f); cap.LineTo(cx, cy + r * 0.35f); cap.LineTo(cx - r, cy - r * 0.2f); cap.Close();
                    c.DrawPath(cap, fill);
                    c.DrawLine(cx - r * 0.55f, cy + r * 0.1f, cx - r * 0.55f, cy + r * 0.6f, line);
                    c.DrawLine(cx + r * 0.55f, cy + r * 0.1f, cx + r * 0.55f, cy + r * 0.6f, line);
                    c.DrawLine(cx - r * 0.55f, cy + r * 0.62f, cx + r * 0.55f, cy + r * 0.62f, line);
                }
                break;
            case "pin":
                using (var pin = new SKPath())
                {
                    pin.AddCircle(cx, cy - r * 0.2f, r * 0.62f);
                    pin.MoveTo(cx - r * 0.5f, cy + r * 0.2f); pin.LineTo(cx, cy + r * 0.95f); pin.LineTo(cx + r * 0.5f, cy + r * 0.2f); pin.Close();
                    c.DrawPath(pin, fill);
                }
                break;
            case "calendar":
                c.DrawRoundRect(new SKRect(cx - r * 0.85f, cy - r * 0.7f, cx + r * 0.85f, cy + r * 0.85f), r * 0.18f, r * 0.18f, line);
                c.DrawLine(cx - r * 0.85f, cy - r * 0.2f, cx + r * 0.85f, cy - r * 0.2f, line);
                c.DrawLine(cx - r * 0.4f, cy - r * 0.95f, cx - r * 0.4f, cy - r * 0.45f, line);
                c.DrawLine(cx + r * 0.4f, cy - r * 0.95f, cx + r * 0.4f, cy - r * 0.45f, line);
                for (var i = 0; i < 3; i++) c.DrawCircle(cx - r * 0.45f + i * r * 0.45f, cy + r * 0.38f, r * 0.09f, fill);
                break;
            case "building":
                using (var roof = new SKPath())
                {
                    roof.MoveTo(cx - r, cy - r * 0.25f); roof.LineTo(cx, cy - r * 0.95f); roof.LineTo(cx + r, cy - r * 0.25f); roof.Close();
                    c.DrawPath(roof, fill);
                }
                for (var i = 0; i < 3; i++) c.DrawLine(cx - r * 0.6f + i * r * 0.6f, cy - r * 0.05f, cx - r * 0.6f + i * r * 0.6f, cy + r * 0.6f, line);
                c.DrawLine(cx - r * 0.95f, cy + r * 0.85f, cx + r * 0.95f, cy + r * 0.85f, line);
                break;
            case "rupee":
                {
                    var size = r * 2.2f;
                    var w = SocialFonts.Measure("₹", size, true);
                    SocialFonts.Draw(c, "₹", cx - w / 2, cy + size * 0.34f, size, color, bold: true);
                }
                break;
            case "news":
                c.DrawRoundRect(new SKRect(cx - r * 0.85f, cy - r * 0.75f, cx + r * 0.85f, cy + r * 0.75f), r * 0.14f, r * 0.14f, line);
                c.DrawLine(cx - r * 0.5f, cy - r * 0.3f, cx + r * 0.5f, cy - r * 0.3f, line);
                c.DrawLine(cx - r * 0.5f, cy + r * 0.05f, cx + r * 0.5f, cy + r * 0.05f, line);
                c.DrawLine(cx - r * 0.5f, cy + r * 0.4f, cx + r * 0.1f, cy + r * 0.4f, line);
                break;
            default: // doc
                c.DrawRoundRect(new SKRect(cx - r * 0.65f, cy - r * 0.9f, cx + r * 0.65f, cy + r * 0.9f), r * 0.14f, r * 0.14f, line);
                c.DrawLine(cx - r * 0.3f, cy - r * 0.35f, cx + r * 0.3f, cy - r * 0.35f, line);
                c.DrawLine(cx - r * 0.3f, cy + r * 0.05f, cx + r * 0.3f, cy + r * 0.05f, line);
                c.DrawLine(cx - r * 0.3f, cy + r * 0.45f, cx + r * 0.1f, cy + r * 0.45f, line);
                break;
        }
    }

    // ================================================================================================
    // Helpers
    // ================================================================================================

    public static string BannerFor(string category) => category switch
    {
        ContentCategories.Job => "RECRUITMENT NOTICE",
        ContentCategories.Result => "RESULT DECLARED",
        ContentCategories.AdmitCard => "ADMIT CARD OUT",
        ContentCategories.Scheme => "GOVT SCHEME UPDATE",
        _ => "LATEST NEWS UPDATE",
    };

    public static SKColor ParseColor(string? value, SKColor fallback) =>
        !string.IsNullOrWhiteSpace(value) && SKColor.TryParse(value.Trim(), out var col) ? col.WithAlpha(255) : fallback;
}
