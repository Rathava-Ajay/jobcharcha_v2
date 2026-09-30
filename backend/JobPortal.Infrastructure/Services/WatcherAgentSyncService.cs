using System.Diagnostics;
using JobPortal.Application.Common;
using JobPortal.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Infrastructure.Services;

/// <summary>Fires the watcher agent on demand instead of waiting for its cadence. On Windows (the
/// admin's local dev box — see scripts/run-watcher-agent.ps1) this runs `schtasks /run`. On Linux
/// (production — see deploy/run-watcher-agent.sh + deploy/systemd/jobcharcha-watcher.*) this runs
/// `systemctl start` on the oneshot unit; the `www-data` user needs a sudoers rule scoped to exactly
/// that one command (see deploy/README.md). Gated behind WatcherAgent:Enabled so it's a silent no-op
/// wherever the runner isn't actually set up yet.
/// The task/service name is server config, never taken from the request, so there's no argument-injection surface.</summary>
public class WatcherAgentSyncService : IWatcherAgentSyncService
{
    private readonly IConfiguration _config;

    public WatcherAgentSyncService(IConfiguration config)
    {
        _config = config;
    }

    public async Task<ServiceResult> TriggerNowAsync()
    {
        if (!_config.GetValue("WatcherAgent:Enabled", false))
            return ServiceResult.Fail("NotAvailable",
                "Manual sync isn't available here — the watcher agent isn't set up to run on this machine.");

        return OperatingSystem.IsWindows() ? await TriggerViaSchtasksAsync() : await TriggerViaSystemdAsync();
    }

    private async Task<ServiceResult> TriggerViaSchtasksAsync()
    {
        var taskName = _config.GetValue("WatcherAgent:TaskName", "JobCharchaWatcherAgent")!;
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "schtasks.exe",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            };
            psi.ArgumentList.Add("/run");
            psi.ArgumentList.Add("/tn");
            psi.ArgumentList.Add(taskName);

            using var process = Process.Start(psi);
            if (process is null) return ServiceResult.Fail("TriggerFailed", "Could not start the sync process.");

            var stderr = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                if (stderr.Contains("currently running", StringComparison.OrdinalIgnoreCase))
                    return ServiceResult.Fail("AlreadyRunning", "A sync is already in progress — check back in a minute or two.");
                return ServiceResult.Fail("TriggerFailed", $"Could not start the sync: {stderr.Trim()}");
            }

            return ServiceResult.Ok();
        }
        catch (Exception ex)
        {
            return ServiceResult.Fail("TriggerFailed", $"Could not start the sync: {ex.Message}");
        }
    }

    private async Task<ServiceResult> TriggerViaSystemdAsync()
    {
        var serviceName = _config.GetValue("WatcherAgent:ServiceName", "jobcharcha-watcher.service")!;
        try
        {
            var isActive = await RunAsync("sudo", "/usr/bin/systemctl", "is-active", "--quiet", serviceName);
            if (isActive.ExitCode == 0)
                return ServiceResult.Fail("AlreadyRunning", "A sync is already in progress — check back in a minute or two.");

            // --no-block: `systemctl start` on a Type=oneshot unit otherwise waits for the whole run
            // to finish (this watcher run takes minutes) before returning — the HTTP request behind
            // this call would sit open the entire time and 504 at the proxy long before that.
            var start = await RunAsync("sudo", "/usr/bin/systemctl", "start", "--no-block", serviceName);
            if (start.ExitCode != 0)
                return ServiceResult.Fail("TriggerFailed", $"Could not start the sync: {start.Stderr.Trim()}");

            return ServiceResult.Ok();
        }
        catch (Exception ex)
        {
            return ServiceResult.Fail("TriggerFailed", $"Could not start the sync: {ex.Message}");
        }
    }

    private static async Task<(int ExitCode, string Stderr)> RunAsync(string fileName, params string[] args)
    {
        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (var arg in args) psi.ArgumentList.Add(arg);

        using var process = Process.Start(psi);
        if (process is null) return (-1, "Could not start the process.");

        var stderr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();
        return (process.ExitCode, stderr);
    }
}
