# JobCharcha deploy runbook (Ubuntu)

Paths below come from `deploy/README.md` and `deploy/systemd/*.service`. If your server differs, change them here once.

| Thing | Path / name |
|---|---|
| API publish dir | `/var/www/jobcharcha-api` |
| API service | `jobcharcha-api` (Kestrel, user `www-data`, port 5101 behind nginx) |
| API env/secrets | `/etc/jobcharcha/jobcharcha-api.env` |
| Frontend repo checkout | `/var/www/jobcharcha/app` |
| Frontend served from | `/var/www/jobcharcha/current` (symlink flipped by prerender) |
| Prerender config | `/etc/jobcharcha-prerender.env` |
| Public hosts | `jobcharcha.com` (frontend), `job.jobcharcha.com` (API) |

---

## 0. Before deploying (on your PC)

```bash
git status                      # make sure the changes you want are committed
dotnet test backend/JobPortal.Tests          # all must pass
git push origin <branch>        # then merge to master if that is what the server pulls
```

---

## 1. Backend (.NET API)

**Option A. Build on the server (simplest, needs .NET 8 SDK installed)**

```bash
ssh <user>@<server>
cd /var/www/jobcharcha/app && git pull
dotnet publish backend/JobPortal.Api -c Release -o /tmp/api-new
sudo systemctl stop jobcharcha-api
sudo cp -a /var/www/jobcharcha-api /var/www/jobcharcha-api.bak     # quick rollback copy
sudo rsync -a /tmp/api-new/ /var/www/jobcharcha-api/
sudo chown -R www-data:www-data /var/www/jobcharcha-api
sudo systemctl start jobcharcha-api
```

**Option B. Build on Windows, upload**

```powershell
dotnet publish backend\JobPortal.Api -c Release -o publish\api
scp -r publish\api\* <user>@<server>:/tmp/api-new/
```
Then on the server: stop service, `rsync` into `/var/www/jobcharcha-api/`, `chown`, start (same as above).

Do not overwrite `appsettings.Production.json` or uploaded files (`uploads/`, `wwwroot`) if they live in the publish dir. Use `rsync --exclude` for them.

**Database changes**: if you added a migration or SQL file (see `deploy/*.sql`), run it BEFORE starting the new API.

---

## 2. Frontend (React/Vite + prerender)

```bash
ssh <user>@<server>
cd /var/www/jobcharcha/app
git pull
npm ci
sudo -u www-data /var/www/jobcharcha/app/deploy/prerender.sh
```
`prerender.sh` runs `vite build`, prerenders every public route, then flips the `current` symlink atomically, so the live site is never half-updated. Build takes about 1–3 min.

Admin-only UI changes (like the Auto-share panel) are in the same bundle, so you still run the above.

---

## 3. Verify after deploy

```bash
systemctl status jobcharcha-api --no-pager
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5101/api/health   # adjust to a real endpoint you have
curl -sI https://jobcharcha.com | head -5
curl -sI https://job.jobcharcha.com/sitemap.xml | head -5
```
Hard-refresh the site (Ctrl+Shift+R) or use a private window to bypass cached JS.

---

## 4. Logs

```bash
# API live log
sudo journalctl -u jobcharcha-api -f
# last 200 lines
sudo journalctl -u jobcharcha-api -n 200 --no-pager
# since a time / errors only
sudo journalctl -u jobcharcha-api --since "30 min ago" -p err --no-pager
# search for one problem
sudo journalctl -u jobcharcha-api --since today --no-pager | grep -i "share image"

# nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# prerender / watcher
sudo journalctl -u jobcharcha-prerender.service -n 100 --no-pager
sudo journalctl -u jobcharcha-watcher.service -n 100 --no-pager
```

---

## 5. Debug checklists

**Site shows old version** → frontend not rebuilt, or browser cache. Re-run `prerender.sh`, hard refresh. Check `readlink /var/www/jobcharcha/current`.

**502 / 504 from the API** →
```bash
systemctl status jobcharcha-api --no-pager
sudo journalctl -u jobcharcha-api -n 100 --no-pager
sudo nginx -t && sudo systemctl reload nginx
ss -ltnp | grep 5101        # is Kestrel listening?
```

**API will not start after deploy** → read the journal. Usual causes: missing env var in `/etc/jobcharcha/jobcharcha-api.env`, DB not reachable, wrong file ownership (`chown -R www-data`), wrong .NET runtime (`dotnet --list-runtimes`).

**Rollback API**
```bash
sudo systemctl stop jobcharcha-api
sudo rsync -a --delete /var/www/jobcharcha-api.bak/ /var/www/jobcharcha-api/
sudo systemctl start jobcharcha-api
```

**Env change only (no code)**: edit `/etc/jobcharcha/jobcharcha-api.env`, then `sudo systemctl restart jobcharcha-api`.

### Auto-share failures (Instagram "needs an image", Telegram/Facebook errors)

1. Open Admin → Auto-share → Activity Log → Failed. The row's message now shows the real reason (after the 2026-10-06 change is deployed).
2. Server side:
   ```bash
   sudo journalctl -u jobcharcha-api --since "1 hour ago" --no-pager | grep -Ei "share|poster|Meta|Chrome|Telegram"
   ```
   Key lines: `Could not build the share image for ...`, `Could not host the share image through Meta ...`, `HTML poster template N failed; using the built-in poster`.
3. Common causes and checks:
   - **Poster designer HTML needs headless Chrome**: `which chromium chromium-browser google-chrome`, and check the Chrome path setting. If it is missing, the built-in poster is used as a fallback.
   - **Image hosting**: `SocialShare:ImageHosting` (`auto`/`meta`) and `SocialShare:PublicBaseUrl` / uploads URL must be a public https address, not localhost.
   - **Uploads folder not writable**: `ls -ld` the uploads dir, owned by `www-data`.
   - **Meta token expired**: Auto-share page shows "Meta token: N days left". Use **Re-check token**; renew the Page token before it expires.
   - **Telegram**: use the **Telegram test** button.
4. Fix, then in Activity Log tap **Retry** on the failed shares.

**Dev machine posting to live DB**: a local run sharing the live database can claim shares too. Stop local backends when testing against live.

---

## 6. Handy server commands

```bash
sudo systemctl restart jobcharcha-api
sudo systemctl status  jobcharcha-api --no-pager
sudo systemctl list-timers | grep jobcharcha
sudo systemctl start jobcharcha-prerender.service        # manual frontend rebuild
sudo systemctl start --no-block jobcharcha-watcher.service   # same as admin "Sync Now"
df -h /var/www ; free -m ; top -bn1 | head -15           # disk / memory / load
sudo nginx -t && sudo systemctl reload nginx
```
