namespace JobPortal.Application.Interfaces;

/// <summary>
/// Minimal in-process work queue for fire-and-forget tasks (e.g. dispatching job-alert emails)
/// that shouldn't block the HTTP request that triggered them. No external broker — a single
/// hosted service drains this in the same process. Not durable across restarts; fine for
/// best-effort notification dispatch at this app's scale.
/// </summary>
public interface IBackgroundTaskQueue
{
    void QueueBackgroundWorkItem(Func<IServiceProvider, CancellationToken, Task> workItem);
    Task<Func<IServiceProvider, CancellationToken, Task>> DequeueAsync(CancellationToken cancellationToken);
}
