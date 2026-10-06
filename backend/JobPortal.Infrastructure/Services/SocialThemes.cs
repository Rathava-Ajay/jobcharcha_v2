using SkiaSharp;

namespace JobPortal.Infrastructure.Services;

/// <summary>One colour scheme of the share image. The layout is always the same notice design; only the colours change, so the
/// Instagram feed does not look like the same picture over and over. Templates are used in rotation: post 1 gets template 1,
/// post 2 template 2, ... post 7 template 1 again.</summary>
public sealed class SocialTheme
{
    public const int Count = 6;

    public required string Name { get; init; }
    public required SKColor Page { get; init; }
    public required SKColor SkyTop { get; init; }
    public required SKColor Wash { get; init; }
    public required SKColor OrgText { get; init; }
    public required SKColor BannerFill { get; init; }
    public required SKColor BannerText { get; init; }
    public required SKColor BannerTail { get; init; }
    public required SKColor PanelBg { get; init; }
    public required SKColor TitleText { get; init; }
    public required SKColor TitleTail { get; init; }
    public required SKColor TitleBadge { get; init; }
    public required SKColor CardHead { get; init; }
    public required SKColor CardLabel { get; init; }
    public required SKColor IconFill { get; init; }
    public required SKColor CardBody { get; init; }
    public required SKColor CardText { get; init; }
    public required SKColor DateLeft { get; init; }
    public required SKColor DateLabel { get; init; }
    public required SKColor DateBg { get; init; }
    public required SKColor DateText { get; init; }
    public required SKColor FooterFill { get; init; }
    public required SKColor FooterText { get; init; }
    public required SKColor FooterDomain { get; init; }
    public required SKColor Rule { get; init; }

    private static SKColor C(string hex) => SKColor.Parse(hex);

    /// <summary>A bright theme built from one strong colour plus a highlight and an accent.</summary>
    private static SocialTheme Light(string name, string primary, string highlight, string accent, string page, string panel, string cardBody, string dateBg, string skyTop) => new()
    {
        Name = name, Page = C(page), SkyTop = C(skyTop), Wash = SKColors.White, OrgText = C(primary),
        BannerFill = C(primary), BannerText = SKColors.White, BannerTail = C(highlight),
        PanelBg = C(panel), TitleText = C(primary), TitleTail = C(accent), TitleBadge = C(primary),
        CardHead = C(primary), CardLabel = C(highlight), IconFill = C(accent), CardBody = C(cardBody), CardText = C(primary),
        DateLeft = C(primary), DateLabel = C(highlight), DateBg = C(dateBg), DateText = C(primary),
        FooterFill = C(primary), FooterText = SKColors.White, FooterDomain = C(highlight), Rule = C(accent),
    };

    public static readonly SocialTheme[] All =
    {
        // 1: the look of the account's current posts
        Light("Navy & Saffron", "#0F2E66", "#FACC15", "#F97316", "#EAF3FC", "#DDECFA", "#FFF1CF", "#FFE1E1", "#BFDBFE"),
        // 2
        Light("Emerald & Amber", "#065F46", "#FDE047", "#EA580C", "#ECFDF5", "#D1FAE5", "#FEF9C3", "#FFEDD5", "#A7F3D0"),
        // 3
        Light("Royal Purple", "#4C1D95", "#FDE68A", "#DB2777", "#F5F3FF", "#EDE9FE", "#FCE7F3", "#FEF3C7", "#DDD6FE"),
        // 4
        Light("Crimson & Gold", "#991B1B", "#FCD34D", "#B45309", "#FFF7ED", "#FFEDD5", "#FEF3C7", "#E0F2FE", "#FED7AA"),
        // 5
        Light("Ocean Teal", "#0F766E", "#FDE047", "#E11D48", "#F0FDFA", "#CCFBF1", "#FFEDD5", "#FFE4E6", "#99F6E4"),
        // 6: the dark one
        new SocialTheme
        {
            Name = "Midnight Saffron", Page = C("#0B1B3A"), SkyTop = C("#1E3A8A"), Wash = C("#0B1B3A"), OrgText = SKColors.White,
            BannerFill = C("#F97316"), BannerText = SKColors.White, BannerTail = C("#0B1B3A"),
            PanelBg = C("#13294F"), TitleText = SKColors.White, TitleTail = C("#FBBF24"), TitleBadge = C("#F97316"),
            CardHead = C("#1E3A8A"), CardLabel = C("#FBBF24"), IconFill = C("#F97316"), CardBody = C("#FFF4E0"), CardText = C("#0B1B3A"),
            DateLeft = C("#F97316"), DateLabel = SKColors.White, DateBg = C("#13294F"), DateText = SKColors.White,
            FooterFill = C("#F97316"), FooterText = SKColors.White, FooterDomain = C("#0B1B3A"), Rule = C("#FBBF24"),
        },
    };

    public static SocialTheme For(int index) => All[((index % Count) + Count) % Count];

    /// <summary>Re-colours a theme with the category's own brand colours (when the admin set them), keeping everything else.</summary>
    public SocialTheme WithBrand(SKColor? primary, SKColor? accent)
    {
        if (primary is null && accent is null) return this;
        var p = primary ?? BannerFill;
        var a = accent ?? IconFill;
        return new SocialTheme
        {
            Name = Name, Page = Page, SkyTop = SkyTop, Wash = Wash, OrgText = primary is null ? OrgText : p,
            BannerFill = p, BannerText = BannerText, BannerTail = BannerTail,
            PanelBg = PanelBg, TitleText = primary is null ? TitleText : p, TitleTail = a, TitleBadge = p,
            CardHead = p, CardLabel = CardLabel, IconFill = a, CardBody = CardBody, CardText = primary is null ? CardText : p,
            DateLeft = p, DateLabel = DateLabel, DateBg = DateBg, DateText = primary is null ? DateText : p,
            FooterFill = p, FooterText = FooterText, FooterDomain = FooterDomain, Rule = a,
        };
    }
}
