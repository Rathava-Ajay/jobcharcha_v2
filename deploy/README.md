# Frontend prerender — deploy setup

Static prerendering: after `vite build`, `scripts/prerender.mjs` drives headless Chromium over
every public route and writes real HTML (content + `<title>`/meta/`<link canonical>` + JSON-LD)
to `dist/<route>/index.html`. `src/main.tsx` calls `hydrateRoot` when `#root` already has markup,
so prerendered pages hydrate onto the snapshot instead of re-rendering from scratch.

Re-render cadence:
- **every 3 h** — `jobcharcha-prerender.timer` (safety net / drift catch)
- **~5 min after an Admin publish** — the API touches `Prerender:FlagPath` on any successful
  content mutation (`ContentChangeRebuildFilter`); `jobcharcha-prerender-watch.timer` runs every
  5 min and rebuilds once the flag has been quiet for `QUIET_SECONDS` (default 120), batching a
  burst of edits into one rebuild.

---

## One-time server setup

```bash
# 1. Node 20+ and the prerender browser (as the deploy/www-data user)
cd /var/www/jobcharcha/app
npm ci
npx playwright install --with-deps chromium        # ~350 MB, pulls the few OS libs Chromium needs

# 2. Layout
mkdir -p /var/www/jobcharcha/releases
# WEB_ROOT is a symlink flipped atomically by prerender.sh:
ln -sfn /var/www/jobcharcha/app/dist /var/www/jobcharcha/current   # placeholder until first run
chmod +x deploy/prerender.sh deploy/prerender-watch.sh

# 3. Config
sudo tee /etc/jobcharcha-prerender.env >/dev/null <<'EOF'
APP_DIR=/var/www/jobcharcha/app
RELEASES_DIR=/var/www/jobcharcha/releases
WEB_ROOT=/var/www/jobcharcha/current
API_BASE=http://127.0.0.1:5101
SITE_ORIGIN=https://jobcharcha.com
FLAG_FILE=/var/www/jobcharcha/.rebuild-requested
QUIET_SECONDS=120
EOF

# 4. Timers
sudo cp deploy/systemd/jobcharcha-prerender*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jobcharcha-prerender.timer jobcharcha-prerender-watch.timer

# 5. First build
sudo -u www-data /var/www/jobcharcha/app/deploy/prerender.sh
```

Set `Prerender:FlagPath` in the API's environment/`appsettings.Production.json` to the same value
as `FLAG_FILE` (`/var/www/jobcharcha/.rebuild-requested`). The API user must be able to write it —
put the API and the prerender job under the same user (`www-data`), or `chown` the flag's parent dir.

Manual rebuild any time: `sudo -u www-data systemctl start jobcharcha-prerender.service`

---

## nginx (frontend host `jobcharcha.com`)

```nginx
root /var/www/jobcharcha/current;   # the symlink prerender.sh flips

# Prerendered file if it exists, else the SPA shell.
location / {
    try_files $uri $uri/index.html /index.html;
}

# Long-cache hashed assets.
location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }

# The sitemap + robots are served by the API host — proxy them from this host so the URL in
# robots.txt (https://jobcharcha.com/sitemap.xml) actually resolves.
location = /sitemap.xml {
    proxy_pass https://job.jobcharcha.com/sitemap.xml;
    proxy_set_header Host job.jobcharcha.com;
}
location = /robots.txt { root /var/www/jobcharcha/current; }  # the built dist/robots.txt

# App API (only needed if you serve the API same-origin instead of on job.jobcharcha.com).
# location /api/ { proxy_pass http://127.0.0.1:5101; }
```

Do **not** cache `/` or `*/index.html` at the CDN/nginx layer beyond a few minutes — a rebuild
must show up promptly.

---

---

## Watcher agent (Scraper Draft Queue "Sync Now")

Scrapes watched sites/Telegram channels and posts drafts into the admin review queue — see
`scripts/watcher-agent-prompt.txt` for exactly what it does (pure HTTP via curl against the live
API, no filesystem writes). Was local-Windows-only (`scripts/run-watcher-agent.ps1` via Windows
Task Scheduler); `deploy/run-watcher-agent.sh` + the systemd units below are the Linux port so
"Sync Now" in the admin UI works from the live site instead of only from a dev machine that
happens to be on.

```bash
# 1. Claude Code CLI, authenticated as its own account on this box (NOT your personal session —
#    this runs unattended and needs its own credentials/API key). Follow claude.ai/code's CLI
#    install docs, then verify:
claude --version

# 2. Let www-data run it (the app dir already exists from the prerender setup above)
chmod +x deploy/run-watcher-agent.sh

# 3. Timer
sudo cp deploy/systemd/jobcharcha-watcher.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jobcharcha-watcher.timer

# 4. Let the API (running as www-data) start that one service on demand, and nothing else —
#    scope the sudoers rule to this exact command, no wildcards. --no-block matters: a plain
#    `systemctl start` on this Type=oneshot unit blocks until the whole multi-minute run
#    finishes, which 504s the admin panel's request — --no-block queues the job and returns.
echo 'www-data ALL=(root) NOPASSWD: /usr/bin/systemctl start --no-block jobcharcha-watcher.service, /usr/bin/systemctl is-active --quiet jobcharcha-watcher.service' \
  | sudo tee /etc/sudoers.d/jobcharcha-watcher
sudo visudo -c   # validate syntax before trusting it

# 5. Flip WatcherAgent__Enabled=true in /etc/jobcharcha/jobcharcha-api.env, then:
sudo systemctl restart jobcharcha-api
```

Manual run any time (bypasses the timer, same as the admin panel's "Sync Now" button):
`sudo systemctl start --no-block jobcharcha-watcher.service`. Logs: `scripts/logs/watcher-*.log`
under the app dir, or `journalctl -u jobcharcha-watcher.service`.

**Security note**: `scripts/watcher-agent-prompt.txt` has the admin login (email + password)
embedded in plain text so the agent can authenticate — that file already existed on the dev laptop;
copying it to a shared production box raises its exposure (anyone with read access to that path, or
a compromise of the box, gets a live admin credential). Restrict its file permissions
(`chmod 600`, owned by `www-data`) at minimum; rotating to a dedicated lower-privilege
"watcher" admin account is a reasonable follow-up if this matters to you.

---

## Notes / limits

- **Build time** scales with content volume (~1–3 s/route, concurrency 8 → current ~230 routes in
  ~1–2 min; ~2 000 jobs ≈ 8–12 min). `deploy/prerender.sh` runs `nice`/`ionice` and swaps
  atomically, so the live site is never affected mid-build. If a run ever overlaps the next timer
  tick the `flock` guard makes the second one exit immediately.
- **Unknown URLs** fall back to `dist/index.html` (the prerendered homepage), then the SPA client-
  routes to `NotFoundPage` (which carries `<meta name="robots" content="noindex">`). If you want a
  hard 404, add `error_page 404 /404.html;` + prerender a `/404` route.
- The prerender snapshot is captured **logged-out** (no token in the headless browser) — matches a
  fresh visitor/crawler. A logged-in user's client hydration re-renders the navbar subtree once.
- i18n snapshots are English; a Gujarati user hydrates and React re-renders the tree once.
- Playwright's request interception reroutes every `/api/*` and `/sitemap.xml` call to `API_BASE`
  during prerender, so the built bundle keeps its real production `VITE_API_BASE_URL`.
