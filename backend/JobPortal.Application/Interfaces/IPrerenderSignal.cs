namespace JobPortal.Application.Interfaces;

/// <summary>
/// Fired after Admin publishes/updates/removes public content. On the deployed single server this
/// just touches a flag file that a systemd watch-timer picks up to re-run the static prerender
/// (scripts/prerender.mjs). A no-op when <c>Prerender:FlagPath</c> is not configured (i.e. in dev).
/// </summary>
public interface IPrerenderSignal
{
    void RequestRebuild(string reason);
}
