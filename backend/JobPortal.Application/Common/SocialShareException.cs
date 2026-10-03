namespace JobPortal.Application.Common;

/// <summary>A failure talking to a social API. <see cref="Retryable"/> tells the worker whether trying again can
/// help (network error, rate limit, 5xx) or not (bad token, chat not found, rejected content). Messages never
/// contain credentials.</summary>
public class SocialShareException : Exception
{
    public bool Retryable { get; }
    /// <summary>Server-suggested wait before the next attempt (e.g. Telegram's retry_after), if any.</summary>
    public TimeSpan? RetryAfter { get; }

    public SocialShareException(string message, bool retryable, TimeSpan? retryAfter = null, Exception? inner = null)
        : base(message, inner)
    {
        Retryable = retryable;
        RetryAfter = retryAfter;
    }
}
