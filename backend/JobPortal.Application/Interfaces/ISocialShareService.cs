using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.DTOs.Social;

namespace JobPortal.Application.Interfaces;

public interface ISocialShareService
{
    /// <summary>Queues shares of a just-published post to every enabled channel. Called by the per-category
    /// services after a post becomes live. Idempotent per (category, post, channel) and never throws — a sharing
    /// problem must not fail the publish. <paramref name="skip"/> is the "Skip social posting" checkbox.</summary>
    Task EnqueueAsync(string category, int entityId, bool skip = false, string? userId = null);

    /// <summary>Manual "Share again": queues a fresh generation of shares for a live post. Returns how many
    /// channel shares were queued.</summary>
    Task<ServiceResult<int>> ShareAgainAsync(string category, int entityId, string userId);

    // ---- Admin actions on a queued share (Activity Log / approval preview) -----------------------

    /// <summary>Approves a share that is waiting for review, optionally with an edited message, and queues it now.</summary>
    Task<ServiceResult> ApproveAsync(int shareId, string? message, string userId);

    /// <summary>Rejects a share that is waiting for review; it is never posted.</summary>
    Task<ServiceResult> RejectAsync(int shareId, string userId);

    /// <summary>Cancels a share that is waiting for approval, queued, or stuck mid-attempt; it is never posted.</summary>
    Task<ServiceResult> CancelAsync(int shareId, string userId);

    /// <summary>Marks a queued/failed share as posted (it is already live on the channel) so it is not posted again.</summary>
    Task<ServiceResult> CompleteAsync(int shareId, string userId);

    /// <summary>Re-queues a failed share (attempt counter reset).</summary>
    Task<ServiceResult> RetryAsync(int shareId, string userId);

    /// <summary>Throws away the generated image and message of a share (and its siblings for the same post) that is still
    /// waiting for review, so the worker builds a fresh preview.</summary>
    Task<ServiceResult> RegenerateAsync(int shareId);

    // ---- Settings & activity log -----------------------------------------------------------------

    Task<List<SocialShareSettingDto>> GetSettingsAsync();
    Task<ServiceResult<SocialShareSettingDto>> UpdateSettingAsync(string category, UpdateSocialShareSettingRequest request);
    Task<PagedResult<SocialShareJobDto>> SearchAsync(int? status, string? category, string? channel, int page = 1, int pageSize = 20);
    Task<SocialShareSummaryDto> GetSummaryAsync();

    /// <summary>The title, public URL and key details a share of this live post would use. Null when the post is not found or not published.</summary>
    Task<SocialPostFacts?> GetPostFactsAsync(string category, int entityId);
}
