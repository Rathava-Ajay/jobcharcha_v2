#!/usr/bin/env bash
# Runs every few minutes (jobcharcha-prerender-watch.timer). If Admin published content and things
# have been quiet for QUIET_SECONDS, kick a full rebuild. The quiet period batches a burst of
# publishes into one rebuild.
set -euo pipefail

[ -f /etc/jobcharcha-prerender.env ] && . /etc/jobcharcha-prerender.env
FLAG_FILE="${FLAG_FILE:-/var/www/jobcharcha/.rebuild-requested}"
QUIET_SECONDS="${QUIET_SECONDS:-120}"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

[ -f "$FLAG_FILE" ] || exit 0

age=$(( $(date +%s) - $(stat -c %Y "$FLAG_FILE") ))
if [ "$age" -lt "$QUIET_SECONDS" ]; then
  echo "[$(date -Is)] watch: flag is ${age}s old (< ${QUIET_SECONDS}s) — waiting for quiet"
  exit 0
fi

echo "[$(date -Is)] watch: rebuilding (flag age ${age}s)"
flock -n /run/jobcharcha-prerender.lock "${DEPLOY_DIR}/prerender.sh"
