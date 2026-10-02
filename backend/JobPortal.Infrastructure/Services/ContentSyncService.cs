using System.Diagnostics;
using System.Text;
using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <summary>Runs the per-category AI agent (headless Claude Code CLI) on demand from the admin "AI Magic" tab.
/// The API process itself launches `claude -p` with the category's prompt file on stdin. The agent only researches
/// (WebSearch/WebFetch) and returns its items as JSON in its final answer; this service parses that and ingests each
/// item through IContentDraftService (same validation and dedupe as the ingest endpoint). Gated behind ContentSync:Enabled — a silent "not available" wherever the
/// CLI isn't set up. Prompt/log paths and the CLI location are server config, never request input.</summary>
public class ContentSyncService : IContentSyncService
{
    private static readonly TimeSpan StaleAfter = TimeSpan.FromMinutes(35);
    private static readonly TimeSpan RunTimeout = TimeSpan.FromMinutes(25);

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<ContentSyncService> _logger;

    public ContentSyncService(AppDbContext db, IConfiguration config, IServiceScopeFactory scopes, ILogger<ContentSyncService> logger)
    {
        _db = db;
        _config = config;
        _scopes = scopes;
        _logger = logger;
    }

    internal static ContentSyncRunDto ToDto(ContentSyncRun r) => new()
    {
        Id = r.Id, Category = r.Category, Status = r.Status, StartedAt = r.StartedAt, FinishedAt = r.FinishedAt,
        NewCount = r.NewCount, SkippedCount = r.SkippedCount, InvalidCount = r.InvalidCount, ErrorMessage = r.ErrorMessage,
    };

    public async Task<List<ContentSyncRunDto>> GetRecentRunsAsync(string? category, int take = 20)
    {
        var q = _db.ContentSyncRuns.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(category)) q = q.Where(r => r.Category == category);
        return (await q.OrderByDescending(r => r.StartedAt).Take(take).ToListAsync()).Select(ToDto).ToList();
    }

    public async Task<ServiceResult<List<ContentSyncRunDto>>> StartAsync(string? category, string userId)
    {
        if (!_config.GetValue("ContentSync:Enabled", false))
            return ServiceResult<List<ContentSyncRunDto>>.Fail("NotAvailable",
                "AI sync isn't available here — the Claude agent isn't set up to run on this machine.");

        var requested = string.IsNullOrWhiteSpace(category) ? ContentCategories.All.ToList() : new List<string> { category.Trim().ToLowerInvariant() };
        if (requested.Any(c => !ContentCategories.IsValid(c)))
            return ServiceResult<List<ContentSyncRunDto>>.Fail("InvalidCategory",
                $"Category must be one of: {string.Join(", ", ContentCategories.All)}.");

        var promptsDir = _config["ContentSync:PromptsDir"];
        if (string.IsNullOrWhiteSpace(promptsDir) || !Directory.Exists(promptsDir))
            return ServiceResult<List<ContentSyncRunDto>>.Fail("NotConfigured", "ContentSync:PromptsDir isn't set to an existing folder.");

        // Anything still Queued/Running past the stale cutoff is a run that died with the app — close it out.
        var cutoff = DateTime.UtcNow - StaleAfter;
        await _db.ContentSyncRuns
            .Where(r => (r.Status == ContentSyncStatus.Queued || r.Status == ContentSyncStatus.Running) && r.StartedAt < cutoff)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Status, ContentSyncStatus.Failed)
                .SetProperty(r => r.FinishedAt, DateTime.UtcNow)
                .SetProperty(r => r.ErrorMessage, "Run timed out or the server restarted."));

        var busy = await _db.ContentSyncRuns.AsNoTracking()
            .Where(r => r.Status == ContentSyncStatus.Queued || r.Status == ContentSyncStatus.Running)
            .Select(r => r.Category).ToListAsync();
        if (busy.Count > 0)
            return ServiceResult<List<ContentSyncRunDto>>.Fail("AlreadyRunning",
                $"A sync is already in progress ({string.Join(", ", busy)}) — wait for it to finish.");

        foreach (var c in requested)
            if (!File.Exists(Path.Combine(promptsDir, c + ".txt")))
                return ServiceResult<List<ContentSyncRunDto>>.Fail("NotConfigured", $"Missing prompt file {c}.txt in {promptsDir}.");

        var runs = requested.Select(c => new ContentSyncRun
        {
            Category = c, Status = ContentSyncStatus.Queued, StartedAt = DateTime.UtcNow, TriggeredById = userId,
        }).ToList();
        _db.ContentSyncRuns.AddRange(runs);
        await _db.SaveChangesAsync();

        var runIds = runs.Select(r => r.Id).ToList();
        _ = Task.Run(() => RunChainAsync(runIds));

        return ServiceResult<List<ContentSyncRunDto>>.Ok(runs.Select(ToDto).ToList());
    }


    /// <summary>Runs the queued categories strictly one after another so six agents never hammer the sites (or
    /// the CLI's rate limit) at once.</summary>
    private async Task RunChainAsync(List<int> runIds)
    {
        foreach (var runId in runIds)
        {
            try
            {
                await RunOneAsync(runId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Content sync run {RunId} crashed", runId);
                await FinishAsync(runId, failed: true, error: "Unexpected error: " + ex.Message);
            }
        }
    }

    private async Task RunOneAsync(int runId)
    {
        string category;
        string prompt;
        string logPath;
        using (var scope = _scopes.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var run = await db.ContentSyncRuns.FindAsync(runId);
            if (run is null) return;
            category = run.Category;

            var sources = await db.ContentSources.AsNoTracking()
                .Where(s => s.Category == category && s.IsActive)
                .Select(s => new { s.Id, s.Name, type = s.SourceType == 1 ? "telegram" : "website", s.Url })
                .ToListAsync();
            var siteCategories = await db.Categories.AsNoTracking().OrderBy(c => c.Id)
                .Select(c => new { c.Id, c.Name }).ToListAsync();

            var logsDir = _config["ContentSync:LogsDir"] ?? Path.Combine(Path.GetTempPath(), "jobcharcha-content-sync");
            Directory.CreateDirectory(logsDir);
            logPath = Path.Combine(logsDir, $"{category}-{DateTime.UtcNow:yyyyMMdd-HHmmss}-run{runId}.log");

            var promptsDir = _config["ContentSync:PromptsDir"]!;
            var commonPath = Path.Combine(promptsDir, "_common.txt");
            var common = File.Exists(commonPath) ? await File.ReadAllTextAsync(commonPath) : "";

            prompt = (await File.ReadAllTextAsync(Path.Combine(promptsDir, category + ".txt")))
                .Replace("{{COMMON}}", common)
                .Replace("{{CATEGORY}}", category)
                .Replace("{{MAX_ITEMS}}", _config.GetValue("ContentSync:MaxItemsPerRun", 10).ToString())
                .Replace("{{FRESH_DAYS}}", _config.GetValue("ContentSync:FreshnessDays", 7).ToString())
                .Replace("{{TODAY}}", DateTime.UtcNow.AddHours(5.5).ToString("yyyy-MM-dd"))
                .Replace("{{CATEGORIES_JSON}}", JsonSerializer.Serialize(siteCategories))
                .Replace("{{SOURCES_JSON}}", JsonSerializer.Serialize(sources));

            run.Status = ContentSyncStatus.Running;
            run.LogPath = logPath;
            await db.SaveChangesAsync();
        }

        var (exitCode, stdout, stderr, timedOut) = await RunClaudeAsync(prompt, logPath);

        if (timedOut) { await FinishAsync(runId, failed: true, error: $"Agent didn't finish within {RunTimeout.TotalMinutes:0} minutes and was stopped."); return; }
        if (exitCode != 0) { await FinishAsync(runId, failed: true, error: Tail("Agent exited with code " + exitCode + ": " + stderr)); return; }

        var (items, parseError) = ParseAgentItems(stdout);
        if (parseError is not null) { await FinishAsync(runId, failed: true, error: parseError); return; }

        // Ingest in a fresh scope; a bad item only counts as invalid, it never aborts the rest.
        var problems = new List<string>();
        using (var scope = _scopes.CreateScope())
        {
            var drafts = scope.ServiceProvider.GetRequiredService<IContentDraftService>();
            foreach (var item in items)
            {
                item.Category = category;
                item.RunId = runId;
                var result = await drafts.IngestAsync(item);
                if (!result.Succeeded) problems.Add($"\"{TitleOf(item)}\": {result.Error}");
            }
        }

        await FinishAsync(runId, failed: false, error: problems.Count == 0 ? null : Tail($"{problems.Count} item(s) rejected - " + string.Join(" | ", problems)));
    }

    private static string TitleOf(IngestContentDraftRequest item) =>
        item.Payload.ValueKind == JsonValueKind.Object && item.Payload.TryGetProperty("title", out var t) ? t.ToString() : "(untitled)";

    /// <summary>The agent's final answer should be { "items": [ { sourceName, sourceUrl, summary, payload } ] },
    /// possibly wrapped in prose or a code fence — take the outermost JSON object.</summary>
    public static (List<IngestContentDraftRequest> Items, string? Error) ParseAgentItems(string cliOutput)
    {
        var empty = new List<IngestContentDraftRequest>();
        string text;
        try
        {
            using var doc = JsonDocument.Parse(cliOutput);
            text = doc.RootElement.TryGetProperty("result", out var r) ? r.GetString() ?? "" : "";
        }
        catch (JsonException) { return (empty, "The agent's output wasn't readable."); }

        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start) return (empty, Tail("The agent didn't return any items. It said: " + text));

        try
        {
            using var doc = JsonDocument.Parse(text[start..(end + 1)]);
            if (!doc.RootElement.TryGetProperty("items", out var arr) || arr.ValueKind != JsonValueKind.Array)
                return (empty, "The agent's answer had no \"items\" list.");
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var items = arr.EnumerateArray()
                .Select(e => e.Deserialize<IngestContentDraftRequest>(opts))
                .Where(i => i is not null && i.Payload.ValueKind == JsonValueKind.Object)
                .Select(i => i!)
                .ToList();
            foreach (var i in items) i.SourceName = string.IsNullOrWhiteSpace(i.SourceName) ? "Web" : i.SourceName;
            return (items, null);
        }
        catch (JsonException ex) { return (empty, Tail("The agent's JSON was malformed: " + ex.Message)); }
    }

    private static string Tail(string s) => s.Length > 900 ? s[^900..] : s;

    private string ResolveClaudePath()
    {
        var configured = _config["ContentSync:ClaudePath"];
        if (!string.IsNullOrWhiteSpace(configured)) return configured;
        if (OperatingSystem.IsWindows())
        {
            var npmShim = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "npm", "claude.cmd");
            if (File.Exists(npmShim)) return npmShim;
        }
        return "claude";
    }

    private async Task<(int ExitCode, string Stdout, string Stderr, bool TimedOut)> RunClaudeAsync(string prompt, string logPath)
    {
        var psi = new ProcessStartInfo
        {
            FileName = ResolveClaudePath(),
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardInputEncoding = new UTF8Encoding(false),
        };
        psi.ArgumentList.Add("-p");
        psi.ArgumentList.Add("--allowedTools");
        // Research tools only; curl is just for HEAD-checking a link, never for calling this API.
        psi.ArgumentList.Add("Bash(curl *),WebSearch,WebFetch");
        psi.ArgumentList.Add("--output-format");
        psi.ArgumentList.Add("json");

        using var process = Process.Start(psi);
        if (process is null) return (-1, "", "Could not start the Claude CLI.", false);

        await process.StandardInput.WriteAsync(prompt);
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        using var cts = new CancellationTokenSource(RunTimeout);
        var timedOut = false;
        try { await process.WaitForExitAsync(cts.Token); }
        catch (OperationCanceledException)
        {
            timedOut = true;
            try { process.Kill(entireProcessTree: true); } catch { /* already gone */ }
        }

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        await File.WriteAllTextAsync(logPath, stdout + (stderr.Length > 0 ? "\n--- stderr ---\n" + stderr : ""));
        return (timedOut ? -1 : process.ExitCode, stdout, stderr, timedOut);
    }

    private async Task FinishAsync(int runId, bool failed, string? error)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.ContentSyncRuns.Where(r => r.Id == runId).ExecuteUpdateAsync(s => s
            .SetProperty(r => r.Status, failed ? ContentSyncStatus.Failed : ContentSyncStatus.Completed)
            .SetProperty(r => r.FinishedAt, DateTime.UtcNow)
            .SetProperty(r => r.ErrorMessage, error));
    }
}
