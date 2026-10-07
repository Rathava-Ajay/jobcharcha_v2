using JobPortal.Application.DTOs.Content;

namespace JobPortal.Application.DTOs.Social;

public static class SocialChannels
{
    public const string Telegram = "telegram";
    public const string Instagram = "instagram";
    public const string Facebook = "facebook";

    public static readonly string[] All = { Telegram, Instagram, Facebook };
}

public static class SocialShareStatus
{
    public const int AwaitingApproval = 0;
    public const int Pending = 1;
    public const int Posted = 2;
    public const int Failed = 3;
    public const int Skipped = 4;
    public const int Processing = 5;
}

public static class SocialShareCategories
{
    /// <summary>The five categories that auto-share.</summary>
    public static readonly string[] All =
    {
        ContentCategories.Job, ContentCategories.Result, ContentCategories.AdmitCard,
        ContentCategories.Scheme, ContentCategories.News,
    };

    public static bool IsValid(string? category) => category is not null && All.Contains(category);
}
