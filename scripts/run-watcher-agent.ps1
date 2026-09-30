# Runs the JobCharcha job-notification watcher agent headlessly via Claude Code.
# Intended to be fired by Windows Task Scheduler every 2 hours. Logs each run's
# output to scripts\logs\watcher-<timestamp>.log for later review.

$ErrorActionPreference = "Stop"
$root = "D:\DreamProject\NewJob"
$promptFile = Join-Path $root "scripts\watcher-agent-prompt.txt"
$logsDir = Join-Path $root "scripts\logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logsDir "watcher-$timestamp.log"

$prompt = Get-Content -Path $promptFile -Raw

$claudeCmd = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claudeCmd) { $claudeCmd = "$env:APPDATA\npm\claude.cmd" }

# Errors go to a sidecar file so a failed run never leaves just an empty log behind.
$errFile = Join-Path $logsDir "watcher-$timestamp.err.log"
"started $(Get-Date -Format o) using $claudeCmd (prompt $($prompt.Length) chars)" | Out-File $errFile -Encoding utf8
try {
    $ErrorActionPreference = "Continue"  # native stderr must not abort the run under "Stop"
    & $claudeCmd -p $prompt --allowedTools "Bash(curl *)" --output-format json > $logFile 2>> $errFile
    "exit code $LASTEXITCODE at $(Get-Date -Format o)" | Out-File $errFile -Append -Encoding utf8
} catch {
    "exception: $($_ | Out-String)" | Out-File $errFile -Append -Encoding utf8
    exit 1
}

# Keep only the most recent 60 run logs (~5 days at 2-hour cadence) so this doesn't grow unbounded.
Get-ChildItem -Path $logsDir -Filter "watcher-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 60 | Remove-Item -Force -ErrorAction SilentlyContinue
