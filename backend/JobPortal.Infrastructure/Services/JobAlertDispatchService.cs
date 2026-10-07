using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

public class JobAlertDispatchService : IJobAlertDispatchService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;
    private readonly ILogger<JobAlertDispatchService> _logger;

    public JobAlertDispatchService(AppDbContext db, IEmailSender emailSender, IConfiguration config, ILogger<JobAlertDispatchService> logger)
    {
        _db = db;
        _emailSender = emailSender;
        _config = config;
        _logger = logger;
    }

    public async Task DispatchForNewJobAsync(int jobId)
    {
        var job = await _db.Jobs.AsNoTracking().Include(j => j.Category)
            .FirstOrDefaultAsync(j => j.Id == jobId && j.IsActive);
        if (job is null) return;

        var candidates = await _db.AlertPreferences.AsNoTracking()
            .Where(a => a.IsActive && a.EmailEnabled)
            .ToListAsync();
        if (candidates.Count == 0) return;

        var categorySlug = job.Category?.Slug;
        var categoryName = job.Category?.Name;
        var locationHaystack = string.Join(" ", new[] { job.Location, job.District, job.State }
            .Where(s => !string.IsNullOrWhiteSpace(s)));

        var matches = candidates
            .Where(a => MatchesCategory(a, categorySlug, categoryName) && MatchesRegion(a, locationHaystack))
            .ToList();
        if (matches.Count == 0) return;

        var matchIds = matches.Select(m => m.Id).ToList();
        var alreadySent = await _db.AlertDispatchLogs.AsNoTracking()
            .Where(l => l.JobId == jobId && matchIds.Contains(l.AlertPreferenceId))
            .Select(l => l.AlertPreferenceId)
            .ToListAsync();

        var toSend = matches.Where(m => !alreadySent.Contains(m.Id)).ToList();
        if (toSend.Count == 0) return;

        var subject = $"New Job Alert: {job.Title}";
        var frontendBaseUrl = (_config["App:FrontendBaseUrl"] ?? "http://localhost:3000").TrimEnd('/');

        var links = CommunityLinks.From(_config, frontendBaseUrl);
        foreach (var pref in toSend)
        {
            var html = BuildEmailBody(job, pref, frontendBaseUrl, links);
            await _emailSender.SendAsync(pref.Email, subject, html);
            _db.AlertDispatchLogs.Add(new AlertDispatchLog { AlertPreferenceId = pref.Id, JobId = jobId, SentAt = DateTime.UtcNow });
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Dispatched job alert for Job {JobId} to {Count} subscriber(s).", jobId, toSend.Count);
    }

    private static bool MatchesCategory(AlertPreference a, string? categorySlug, string? categoryName)
    {
        if (string.IsNullOrWhiteSpace(a.PreferredCategories)) return true; // no preference set = all categories
        var wanted = a.PreferredCategories.Split(',', StringSplitOptions.RemoveEmptyEntries);
        return wanted.Any(w => string.Equals(w, categorySlug, StringComparison.OrdinalIgnoreCase)
            || string.Equals(w, categoryName, StringComparison.OrdinalIgnoreCase));
    }

    private static bool MatchesRegion(AlertPreference a, string locationHaystack)
    {
        if (string.IsNullOrWhiteSpace(a.PreferredCities)) return true;
        if (a.PreferredCities.Equals("All India / Central", StringComparison.OrdinalIgnoreCase)) return true;
        return locationHaystack.Contains(a.PreferredCities, StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildEmailBody(Job job, AlertPreference pref, string frontendBaseUrl, CommunityLinks links)
    {
        var unsubscribeUrl = $"{frontendBaseUrl}/unsubscribe/{pref.UnsubscribeToken}";
        var jobUrl = $"{frontendBaseUrl}/jobs/{job.Slug}";
        return JobAlertEmailTemplate.Build(job, job.Category?.Name ?? "Job", jobUrl, unsubscribeUrl, links);
    }
}
