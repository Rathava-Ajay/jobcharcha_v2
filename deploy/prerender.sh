#!/usr/bin/env bash
# Full rebuild + static prerender + atomic swap of the frontend, on the deployed single server.
#
#   deploy/prerender.sh                     # full: npm build -> prerender -> atomic swap
#   deploy/prerender.sh --routes-file PATH  # partial: re-render just those routes into the live tree
#
# Config (override in /etc/jobcharcha-prerender.env):
#   APP_DIR       repo checkout                default /var/www/jobcharcha/app
#   RELEASES_DIR  where build dirs live        default /var/www/jobcharcha/releases
#   WEB_ROOT      symlink nginx serves         default /var/www/jobcharcha/current
#   API_BASE      local API origin             default http://127.0.0.1:5101
#   SITE_ORIGIN   public frontend origin       default https://jobcharcha.com
#   FLAG_FILE     publish-trigger flag         default /var/www/jobcharcha/.rebuild-requested
set -euo pipefail

[ -f /etc/jobcharcha-prerender.env ] && . /etc/jobcharcha-prerender.env
APP_DIR="${APP_DIR:-/var/www/jobcharcha/app}"
RELEASES_DIR="${RELEASES_DIR:-/var/www/jobcharcha/releases}"
WEB_ROOT="${WEB_ROOT:-/var/www/jobcharcha/current}"
export API_BASE="${API_BASE:-http://127.0.0.1:5101}"
export SITE_ORIGIN="${SITE_ORIGIN:-https://jobcharcha.com}"
FLAG_FILE="${FLAG_FILE:-/var/www/jobcharcha/.rebuild-requested}"
RUN="nice -n 15 ionice -c3"

cd "$APP_DIR"

# ---- Partial: re-render only the changed routes straight into the live tree, no swap -------------
if [ "${1:-}" = "--routes-file" ] && [ -n "${2:-}" ]; then
  echo "[$(date -Is)] prerender: partial ($(wc -l < "$2") route(s))"
  DIST="$(readlink -f "$WEB_ROOT")" $RUN node scripts/prerender.mjs --routes-file "$2"
  rm -f "$FLAG_FILE"
  exit 0
fi

# ---- Full rebuild -------------------------------------------------------------------------------
echo "[$(date -Is)] prerender: npm build"
$RUN npm ci --omit=dev --no-audit --fund=false
$RUN npm run build
$RUN node scripts/prerender.mjs                       # -> ./dist

REL="${RELEASES_DIR}/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RELEASES_DIR"
cp -a dist "$REL"
ln -sfn "$REL" "$WEB_ROOT"                            # atomic symlink flip
nginx -s reload

ls -1dt "${RELEASES_DIR}"/*/ 2>/dev/null | tail -n +4 | xargs -r rm -rf   # keep last 3
rm -f "$FLAG_FILE"
echo "[$(date -Is)] prerender: live -> ${REL##*/}, nginx reloaded"
