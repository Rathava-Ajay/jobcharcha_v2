namespace JobPortal.Application.Interfaces;

public interface IJobAlertDispatchService
{
    /// <summary>Emails every matching, not-yet-notified AlertPreference about a newly active job.</summary>
    Task DispatchForNewJobAsync(int jobId);
}
