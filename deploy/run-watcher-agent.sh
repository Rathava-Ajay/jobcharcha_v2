#!/usr/bin/env bash
# Runs the JobCharcha job-notification watcher agent headlessly via the Claude Code CLI.
# Linux port of scripts/run-watcher-agent.ps1 — fired by jobcharcha-watcher.timer, and on-demand
# by WatcherAgentSyncService.TriggerNowAsync() via `systemctl start jobcharcha-watcher.service`.
# Logs each run's output to $LOGS_DIR/watcher-<timestamp>.log for later review.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/jobcharcha/app}"
PROMPT_FILE="${PROMPT_FILE:-$APP_DIR/scripts/watcher-agent-prompt.txt}"
LOGS_DIR="${LOGS_DIR:-$APP_DIR/scripts/logs}"

mkdir -p "$LOGS_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOGS_DIR/watcher-$TIMESTAMP.log"

claude -p "$(cat "$PROMPT_FILE")" --allowedTools "Bash(curl *)" --output-format json > "$LOG_FILE" 2>&1

# Keep only the most recent 60 run logs (~5 days at 2-hour cadence) so this doesn't grow unbounded.
find "$LOGS_DIR" -maxdepth 1 -name 'watcher-*.log' -printf '%T@ %p\n' 2>/dev/null \
  | sort -rn | tail -n +61 | cut -d' ' -f2- | xargs -r rm -f
