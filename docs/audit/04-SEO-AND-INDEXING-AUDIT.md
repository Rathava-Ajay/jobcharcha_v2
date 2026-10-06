# 04 — SEO and indexing audit

**Google Search Console data: REQUIRES EXTERNAL VERIFICATION.** No Search Console access exists in this environment. Nothing below claims anything about Google's index, coverage, impressions or manual actions.

Live probes were run 2026-10-06 against https://jobcharcha.com (read-only GETs).

| # | Finding | Evidence | Class / Severity | Status |
|---|---|---|---|---|
| H1 | **`/sitemap.xml` is not a sitemap on the live site** — it returns the SPA's `index.html` (`Content-Type: text/html`, 4,314 bytes). `robots.txt` advertises this URL, so Google gets HTML | `curl` live; E2E `seo-and-hosting` fails on live, passes against the API | CONFIGURATION ISSUE · **HIGH** | nginx must proxy `/sitemap.xml` → `127.0.0.1:5101`. Block provided in `deploy/nginx-jobcharcha.conf.example`. **Not applied** |
| H5 | **Raw HTML of live pages is the bare SPA shell.** The checked job pages (`/jobs/<slug>` ×2) and `/jobs` all return the identical 4,314-byte shell: no per-page `<title>`, canonical, OG tags or JSON-LD *before JavaScript runs*. Googlebot renders JS so indexing can still work, but **WhatsApp/Telegram/Facebook/Twitter link previews do not run JS** — shared job links preview as the generic homepage | `curl` of two job URLs and `/jobs` | SEO IMPROVEMENT · **HIGH** (for paid social/WhatsApp traffic) | The repo has a prerender pipeline (`deploy/prerender.sh`, systemd timers) that should write per-route HTML. It evidently is not serving these pages. **REQUIRES EXTERNAL VERIFICATION** on the server: `systemctl status jobcharcha-prerender.timer`, check `/var/www/jobcharcha/current/jobs/<slug>/index.html` exists |
| M2 | `https://www.jobcharcha.com/` returns a full **200** page (duplicate host) | `curl -I` | CONFIGURATION ISSUE · MEDIUM | 301 → bare domain in the nginx example |
| M3 | Unknown URLs return **HTTP 200** (SPA shell; the in-app 404 page is `noindex`) | random path → 200 | SEO IMPROVEMENT · MEDIUM | **Deliberately not changed.** A hard 404 would 404 brand-new job pages until the next prerender. Revisit only if Search Console reports Soft 404 at scale (documented in the nginx example) |
| — | http → https | 301 to `https://jobcharcha.com/` | OK | — |
| — | `robots.txt` | Allows `/`, blocks `/admin/`, `/dashboard/`, `/login`, declares sitemap | OK | — |
| — | Trailing slash (`/jobs/`) | 200, canonical (client-side) points to the slash-less URL | OK (relies on client JS; fixed properly by prerender) | — |
| L1 | Meta description > 170 chars on **90** jobs; meta title > 70 chars on **76** | live API scan | SEO IMPROVEMENT · LOW | Reported, content not edited |
| — | Local sitemap content | 316 URLs: 238 jobs, 18 news, 15 blog, 13 results, 10 admit cards, 8 old papers, … Base URL follows `App:FrontendBaseUrl` (localhost locally) | OK — **confirm `FrontendBaseUrl` is `https://jobcharcha.com` in production config** (REQUIRES EXTERNAL VERIFICATION) | — |
| — | Structured data | `JobPosting` (govt + private), `FAQPage` where FAQ content exists — valid JSON, required fields present (E2E). Org/WebSite/Breadcrumb absent | see report 01 | OPTIONAL |
| — | `noindex` | Only the in-app 404 page and login-gated areas | OK | — |

## Do this, in this order

1. Apply the nginx sitemap + www + header blocks → `curl -s https://jobcharcha.com/sitemap.xml | head -c 100` must begin `<?xml`.
2. Get the prerender job running → `curl -s https://jobcharcha.com/jobs/<slug> | grep -c 'rel="canonical"'` must be 1.
3. Submit the sitemap in Search Console and watch Coverage / Soft 404 (REQUIRES EXTERNAL VERIFICATION).
4. Re-run: `E2E_BASE_URL=https://jobcharcha.com E2E_API_URL=https://jobcharcha.com npx playwright test seo-and-hosting`.
