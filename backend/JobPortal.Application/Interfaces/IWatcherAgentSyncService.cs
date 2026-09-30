using JobPortal.Application.Common;

namespace JobPortal.Application.Interfaces;

/// <summary>Lets an admin manually kick off the job-notification watcher instead of waiting for its
/// next scheduled run. Only wired up where a local watcher runner actually exists (see WatcherAgentSyncService) —
/// disabled by default, opt-in via config.</summary>
public interface IWatcherAgentSyncService
{
    Task<ServiceResult> TriggerNowAsync();
}
