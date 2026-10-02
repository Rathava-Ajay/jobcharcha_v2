using System.Collections.Concurrent;
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
/// item through IContentDraftService (same validation and dedupe as the ingest endpoint). Gated behind
/// ContentSync:Enabled — a silent "not available" wherever the CLI isn't set up. Prompt/log paths and the CLI
/// location are server config, never request input.
/// Runs are tracked in an in-process registry (<see cref="Active"/>) so an admin can cancel them and so a run left
/// "Running" in the database by a restart is recognised as dead immediately. That assumes ONE API instance, which is how
/// this app is deployed (a single Kestrel behind Nginx).</summary>
public class ContentSyncService : IContentSyncService
{
    private static readonly TimeSpan RunTimeout = TimeSpan.FromMinutes(25);

    /// <summary>Run id → live state, for every run that is queued or running in THIS process.</summary>
    private static readonly ConcurrentDictionary<int, RunState> Active = new();

    private sealed class RunState
    {
        public CancellationTokenSource Cts { get; } = new();
        public volatile bool CancelRequested;
    }

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
        NewCount = r.NewCount, SkippedCount = r.SkippedCount, InvalidCount = r.InvalidCount,
        ErrorMessage = r.ErrorMessage, Note = r.Note,
    };

    public async Task<List<ContentSyncRunDto>> GetRecentRunsAsync(string? category, int take = 20)
    {
        await CloseOrphansAsync(_db);
        var q = _db.ContentSyncRuns.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(category)) q = q.Where(r => r.Category == category);
        return (await q.OrderByDescending(r => r.StartedAt).Take(Math.Clamp(take, 1, 100)).ToListAsync()).Select(ToDto).ToList();
    }

    /// <summary>Runs recorded as Queued/Running in the database that no live task in this process owns — they died
    /// with a previous process. Pure so it can be tested.</summary>
    public static List<ContentSyncRun> FindOrphans(IEnumerable<ContentSyncRun> activeInDb, Func<int, bool> isLiveHere) =>
        activeInDb.Where(r => (r.Status == ContentSyncStatus.Queued || r.Status == ContentSyncStatus.Running) && !isLiveHere(r.Id)).ToList();

    /// <summary>Marks runs a previous process left Queued/Running as Failed. Called whenever run state is read or a sync
    /// starts, so a crash or restart never leaves the UI stuck on "Sync running" with its buttons disabled.</summary>
    public static async Task CloseOrphansAsync(AppDbContext db)
    {
        var candidates = await db.ContentSyncRuns
            .Where(r => r.Status == ContentSyncStatus.Queued || r.Status == ContentSyncStatus.Running).ToListAsync();
        foreach (var r in FindOrphans(candidates, Active.ContainsKey))
        {
            r.Status = ContentSyncStatus.Failed;
            r.FinishedAt = DateTime.UtcNow;
            r.ErrorMessage = "Interrupted: the server restarted while this run was in progress.";
        }
        if (db.ChangeTracker.HasChanges()) await db.SaveChangesAsync();
    }

    public async Task<ServiceResult<List<ContentSyncRunDto>>> StartAsync(string? category, string userId)
    {
        if (!_config.GetValue("ContentSync:Enabled", false))
            return ServiceResult<List<ContentSyncRunDto>>.Fail("NotAvailable",
                "AI sync isn't available here — the Claude agent isn't set up to run on this machine.");

        var settings = ContentSettingsService.Merge(await _db.ContentCategorySettings.AsNoTracking().ToListAsync(), _config);
        var (requested, resolveError) = ResolveCategories(category, settings);
        if (resolveError is not null)
            return ServiceResult<List<ContentSyncRunDto>>.Fail(resolveError.Value.Code, resolveError.Value.Message);

        var promptsDir = _config["ContentSync:PromptsDir"];
        if (string.IsNullOrWhiteSpace(promptsDir) || !Directory.Exists(promptsDir))
            return ServiceResult<List<ContentSyncRunDto>>.Fail("NotConfigured", "ContentSync:PromptsDir isn't set to an existing folder.");

        await CloseOrphansAsync(_db);

        var busy = await _db.ContentSyncRuns.AsNoTracking()
            .Where(r => r.Status == ContentSyncStatus.Queued || r.Status == ContentSyncStatus.Running)
            .Select(r => r.Category).ToListAsync();
        if (busy.Count > 0)
            return ServiceResult<List<ContentSyncRunDto>>.Fail("AlreadyRunning",
                $"A sync is already in progress ({string.Join(", ", busy)}) — wait for it to finish or cancel it.");

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
        foreach (var id in runIds) Active[id] = new RunState();
        _ = Task.Run(() => RunChainAsync(runIds));

        return ServiceResult<List<ContentSyncRunDto>>.Ok(runs.Select(ToDto).ToList());
    }

    /// <summary>Cancels one run, or every queued/running run when no id is given. A running agent is killed;
    /// queued ones simply never start. Returns how many runs were cancelled.</summary>
    public async Task<ServiceResult<int>> CancelAsync(int? runId)
    {
        var q = _db.ContentSyncRuns.Where(r => r.Status == ContentSyncStatus.Queued || r.Status == ContentSyncStatus.Running);
        if (runId.HasValue) q = q.Where(r => r.Id == runId.Value);
        var runs = await q.ToListAsync();
        if (runs.Count == 0)
            return ServiceResult<int>.Fail("NothingToCancel", runId.HasValue ? "That run has already finished." : "There is no sync in progress.");

        foreach (var r in runs)
        {
            if (Active.TryGetValue(r.Id, out var state))
            {
                state.CancelRequested = true;
                try { state.Cts.Cancel(); } catch (ObjectDisposedException) { /* run just finished */ }
            }
            r.Status = ContentSyncStatus.Cancelled;
            r.FinishedAt = DateTime.UtcNow;
            r.ErrorMessage = "Cancelled by an admin.";
        }
        await _db.SaveChangesAsync();
        return ServiceResult<int>.Ok(runs.Count);
    }

    /// <summary>Which categories a sync request should run: "all" means every ENABLED category; naming one that
    /// has been switched off is an error rather than a silent no-op.</summary>
    public static (List<string> Categories, (string Code, string Message)? Error) ResolveCategories(
        string? category, List<ContentCategorySettingDto> settings)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            var enabled = settings.Where(s => s.IsEnabled).Select(s => s.Category).ToList();
            return enabled.Count == 0
                ? (enabled, ("AllDisabled", "Every category is switched off in its settings — enable at least one to sync."))
                : (enabled, null);
        }

        var c = category.Trim().ToLowerInvariant();
        if (!ContentCategories.IsValid(c))
            return (new List<string>(), ("InvalidCategory", $"Category must be one of: {string.Join(", ", ContentCategories.All)}."));
        if (settings.Any(s => s.Category == c && !s.IsEnabled))
            return (new List<string>(), ("CategoryDisabled", $"{c} is switched off in its settings — enable it to sync."));
        return (new List<string> { c }, null);
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
                await FinishAsync(runId, ContentSyncStatus.Failed, "Unexpected error: " + ex.Message, null);
            }
            finally
            {
                if (Active.TryRemove(runId, out var state)) state.Cts.Dispose();
            }
        }
    }

    private async Task RunOneAsync(int runId)
    {
        if (!Active.TryGetValue(runId, out var state)) return;

        string category;
        string prompt;
        string logPath;
        using (var scope = _scopes.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var run = await db.ContentSyncRuns.FindAsync(runId);
            // Cancelled while it was still waiting its turn in the chain: nothing to do.
            if (run is null || run.Status != ContentSyncStatus.Queued || state.CancelRequested) return;
            category = run.Category;

            var sources = await db.ContentSources.AsNoTracking()
                .Where(s => s.Category == category && s.IsActive)
                .Select(s => new { s.Id, s.Name, type = s.SourceType == 1 ? "telegram" : "website", s.Url })
                .ToListAsync();
            var setting = (await db.ContentCategorySettings.AsNoTracking().FirstOrDefaultAsync(s => s.Category == category)) is { } row
                ? ContentSettingsService.ToDto(row)
                : ContentSettingsService.Defaults(category, _config);
            var extra = string.IsNullOrWhiteSpace(setting.ExtraInstructions)
                ? ""
                : "\nEXTRA INSTRUCTIONS FROM THE SITE ADMIN (follow these, but never at the cost of accuracy or the rules above):\n" + setting.ExtraInstructions + "\n";
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
                .Replace("{{EXTRA_INSTRUCTIONS}}", extra)
                .Replace("{{MAX_ITEMS}}", setting.MaxItemsPerRun.ToString())
                .Replace("{{FRESH_DAYS}}", setting.FreshnessDays.ToString())
                .Replace("{{TODAY}}", DateTime.UtcNow.AddHours(5.5).ToString("yyyy-MM-dd"))
                .Replace("{{CATEGORIES_JSON}}", JsonSerializer.Serialize(siteCategories))
                .Replace("{{SOURCES_JSON}}", JsonSerializer.Serialize(sources));

            run.Status = ContentSyncStatus.Running;
            run.LogPath = logPath;
            await db.SaveChangesAsync();
        }

        var (exitCode, stdout, stderr, outcome) = await RunClaudeAsync(prompt, logPath, state.Cts.Token);

        // The admin may have cancelled between the process ending and now — then nothing must be ingested.
        if (outcome == ProcessOutcome.Cancelled || state.CancelRequested) { await FinishAsync(runId, ContentSyncStatus.Cancelled, "Cancelled by an admin.", null); return; }
        if (outcome == ProcessOutcome.TimedOut) { await FinishAsync(runId, ContentSyncStatus.Failed, $"Agent didn't finish within {RunTimeout.TotalMinutes:0} minutes and was stopped.", null); return; }
        if (exitCode != 0) { await FinishAsync(runId, ContentSyncStatus.Failed, Tail("Agent exited with code " + exitCode + ": " + stderr), null); return; }

        var (items, parseError, note) = ParseAgentItems(stdout);
        if (parseError is not null) { await FinishAsync(runId, ContentSyncStatus.Failed, parseError, null); return; }

        // Ingest in a fresh scope; a bad item only counts as invalid, it never aborts the rest.
        var problems = new List<string>();
        using (var scope = _scopes.CreateScope())
        {
            var drafts = scope.ServiceProvider.GetRequiredService<IContentDraftService>();
            foreach (var item in items)
            {
                if (state.CancelRequested) break;
                item.Category = category;
                item.RunId = runId;
                var result = await drafts.IngestAsync(item);
                if (!result.Succeeded) problems.Add($"\"{TitleOf(item)}\": {result.Error}");
            }
        }

        if (state.CancelRequested) { await FinishAsync(runId, ContentSyncStatus.Cancelled, "Cancelled by an admin.", null); return; }
        await FinishAsync(runId, ContentSyncStatus.Completed,
            problems.Count == 0 ? null : Tail($"{problems.Count} item(s) rejected - " + string.Join(" | ", problems)), note);
    }

    private static string TitleOf(IngestContentDraftRequest item) =>
        item.Payload.ValueKind == JsonValueKind.Object && item.Payload.TryGetProperty("title", out var t) ? t.ToString() : "(untitled)";

    /// <summary>The agent's final answer should be { "items": [ { sourceName, sourceUrl, summary, payload } ], "note": "..." },
    /// possibly wrapped in prose or a code fence — take the outermost JSON object. The optional note is the agent's own
    /// one-line explanation (most useful when it found nothing) and is kept on the run.</summary>
    public static (List<IngestContentDraftRequest> Items, string? Error, string? Note) ParseAgentItems(string cliOutput)
    {
        var empty = new List<IngestContentDraftRequest>();
        string text;
        try
        {
            using var doc = JsonDocument.Parse(cliOutput);
            text = doc.RootElement.TryGetProperty("result", out var r) ? r.GetString() ?? "" : "";
        }
        catch (JsonException) { return (empty, "The agent's output wasn't readable.", null); }

        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start) return (empty, Tail("The agent didn't return any items. It said: " + text), null);

        try
        {
            using var doc = JsonDocument.Parse(text[start..(end + 1)]);
            if (!doc.RootElement.TryGetProperty("items", out var arr) || arr.ValueKind != JsonValueKind.Array)
                return (empty, "The agent's answer had no \"items\" list.", null);
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var items = arr.EnumerateArray()
                .Select(e => e.Deserialize<IngestContentDraftRequest>(opts))
                .Where(i => i is not null && i.Payload.ValueKind == JsonValueKind.Object)
                .Select(i => i!)
                .ToList();
            foreach (var i in items) i.SourceName = string.IsNullOrWhiteSpace(i.SourceName) ? "Web" : i.SourceName;

            string? note = null;
            if (doc.RootElement.TryGetProperty("note", out var n) && n.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(n.GetString()))
                note = Tail(n.GetString()!.Trim());
            return (items, null, note);
        }
        catch (JsonException ex) { return (empty, Tail("The agent's JSON was malformed: " + ex.Message), null); }
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

    private enum ProcessOutcome { Finished, TimedOut, Cancelled }

    private async Task<(int ExitCode, string Stdout, string Stderr, ProcessOutcome Outcome)> RunClaudeAsync(
        string prompt, string logPath, CancellationToken cancel)
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
        if (process is null) return (-1, "", "Could not start the Claude CLI.", ProcessOutcome.Finished);

        await process.StandardInput.WriteAsync(prompt);
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        using var timeout = new CancellationTokenSource(RunTimeout);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancel, timeout.Token);
        var outcome = ProcessOutcome.Finished;
        try { await process.WaitForExitAsync(linked.Token); }
        catch (OperationCanceledException)
        {
            outcome = cancel.IsCancellationRequested ? ProcessOutcome.Cancelled : ProcessOutcome.TimedOut;
            try { process.Kill(entireProcessTree: true); } catch { /* already gone */ }
        }

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        await File.WriteAllTextAsync(logPath, stdout + (stderr.Length > 0 ? "\n--- stderr ---\n" + stderr : ""));
        return (outcome == ProcessOutcome.Finished ? process.ExitCode : -1, stdout, stderr, outcome);
    }

    /// <summary>Records the final state, but never overwrites a run an admin already cancelled.</summary>
    private async Task FinishAsync(int runId, int status, string? error, string? note)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.ContentSyncRuns.Where(r => r.Id == runId && r.Status != ContentSyncStatus.Cancelled).ExecuteUpdateAsync(s => s
            .SetProperty(r => r.Status, status)
            .SetProperty(r => r.FinishedAt, DateTime.UtcNow)
            .SetProperty(r => r.ErrorMessage, error)
            .SetProperty(r => r.Note, note));
    }
}
