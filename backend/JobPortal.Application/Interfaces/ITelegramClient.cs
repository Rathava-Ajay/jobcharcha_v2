namespace JobPortal.Application.Interfaces;

/// <summary>Thin wrapper over the Telegram Bot API for posting to the configured channel. Both calls return the
/// channel message_id and throw <see cref="Common.SocialShareException"/> on failure.</summary>
public interface ITelegramClient
{
    Task<string> SendMessageAsync(string html, string buttonText, string buttonUrl, CancellationToken ct = default);
    Task<string> SendPhotoAsync(string imageUrl, string captionHtml, string buttonText, string buttonUrl, CancellationToken ct = default);
}
