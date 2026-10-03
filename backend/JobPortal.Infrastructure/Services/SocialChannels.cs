using System.Text.Json;
using JobPortal.Application.DTOs.Social;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data.Entities;

namespace JobPortal.Infrastructure.Services;

/// <summary>Posts one <see cref="SocialShareJob"/> to one channel and returns the external id (Telegram
/// message_id, Facebook post id, Instagram media id). Throws <see cref="JobPortal.Application.Common.SocialShareException"/>.</summary>
public interface ISocialChannel
{
    string Channel { get; }
    Task<string> PostAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct);
}

public static class SocialJobDetails
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = true };

    public static List<SocialDetail> Read(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try { return JsonSerializer.Deserialize<List<SocialDetail>>(json, Options) ?? new(); }
        catch (JsonException) { return new(); }
    }
}

/// <summary>Telegram: sendPhoto with a caption when the share has an image, otherwise sendMessage. If the photo
/// itself is rejected the text still goes out, so a bad image never loses the announcement.</summary>
public class TelegramChannel : ISocialChannel
{
    private readonly ITelegramClient _telegram;

    public TelegramChannel(ITelegramClient telegram) => _telegram = telegram;

    public string Channel => SocialChannels.Telegram;

    public async Task<string> PostAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct)
    {
        var button = TelegramMessageRenderer.ButtonText(job.Category);

        if (!string.IsNullOrWhiteSpace(job.ImageUrl))
        {
            var caption = TextFor(job, setting, TelegramMessageRenderer.CaptionLimit);
            try
            {
                return await _telegram.SendPhotoAsync(job.ImageUrl, caption, button, job.Url, ct);
            }
            catch (JobPortal.Application.Common.SocialShareException ex) when (ex.Retryable == false)
            {
                // Fall through to a text-only post (e.g. Telegram couldn't fetch the image URL).
            }
        }

        var text = TextFor(job, setting, TelegramMessageRenderer.MessageLimit, asCaption: false);
        return await _telegram.SendMessageAsync(text, button, job.Url, ct);
    }

    /// <summary>Prefers the stored (possibly admin-approved) message when it fits; otherwise renders fresh.</summary>
    private static string TextFor(SocialShareJob job, SocialShareSetting setting, int limit, bool asCaption = true)
    {
        if (!string.IsNullOrWhiteSpace(job.Message) && job.Message.Length <= limit) return job.Message;
        return TelegramMessageRenderer.Render(job.Category, setting.TelegramTemplate, job.Title, job.Url, SocialJobDetails.Read(job.DetailsJson), asCaption);
    }
}

/// <summary>Facebook Page: photo post with the caption; a link post when there is no image.</summary>
public class FacebookChannel : ISocialChannel
{
    private readonly IMetaGraphClient _meta;

    public FacebookChannel(IMetaGraphClient meta) => _meta = meta;

    public string Channel => SocialChannels.Facebook;

    public Task<string> PostAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct)
    {
        var caption = string.IsNullOrWhiteSpace(job.Message) ? SocialMessages.Build(Channel, job, setting) : job.Message;
        return string.IsNullOrWhiteSpace(job.ImageUrl)
            ? _meta.PostPageFeedAsync(caption, job.Url, ct)
            : _meta.PostPagePhotoAsync(job.ImageUrl, caption, ct);
    }
}

/// <summary>Instagram Business account: media container, then media_publish. Instagram cannot post without an image.</summary>
public class InstagramChannel : ISocialChannel
{
    private readonly IMetaGraphClient _meta;

    public InstagramChannel(IMetaGraphClient meta) => _meta = meta;

    public string Channel => SocialChannels.Instagram;

    public Task<string> PostAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(job.ImageUrl))
            throw new JobPortal.Application.Common.SocialShareException("Instagram needs an image and none could be generated.", retryable: false);

        var caption = string.IsNullOrWhiteSpace(job.Message) ? SocialMessages.Build(Channel, job, setting) : job.Message;
        return _meta.PublishInstagramPhotoAsync(job.ImageUrl, caption, ct);
    }
}
