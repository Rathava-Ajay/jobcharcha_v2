# 10 — Marketing readiness

## STATUS: **NOT READY**

**Today the production site has a live, confirmed critical flaw: all paid study materials can be downloaded by anyone without paying.** The fix is written and verified locally, but it is not deployed. Per the rule that READY requires critical/high blockers resolved *and* important journeys passing, the honest status for the site as it is right now is NOT READY.

**Expected status after the steps below are completed and re-verified: LIMITED PILOT** (not READY — see "Why not READY after the fixes").

## Exact blockers preventing marketing

1. **C1 — deploy the API fix, then replace the three Drive sharing links.** Verify: `GET https://jobcharcha.com/api/products` shows no `googleDrive*` links.
2. **H1 — live `/sitemap.xml` returns HTML.** Apply the nginx block; verify it starts with `<?xml`.
3. **H5 — pages are served as the bare SPA shell** (no per-page OG/canonical/JSON-LD in raw HTML). Confirm/restore the prerender job so shared job links preview correctly. This directly affects ad creatives that link to a job and WhatsApp/Telegram sharing.
4. **H2 — confirm the Razorpay webhook** (URL, secret, `payment.captured` subscribed) and run **one sandbox purchase + one closed-tab purchase** end to end.
5. **H3 — restore the 20 missing notification PDFs**, starting with open jobs (one open job currently shows a dead official-notification link).

## Why not READY after the fixes

- **H4:** the paid download is still a permanent Drive link; a paying customer can share it. Acceptable for a pilot of low-priced PDFs, not for scaled paid acquisition of ₹299 products.
- Browser sandbox checkout, GA4 event verification and Search Console are unverified (REQUIRES EXTERNAL VERIFICATION / MANUAL TEST).
- Only 21 open jobs: little fresh inventory to send paid traffic to.

## Suggested pilot (after blockers 1–5)

Small daily budget; ad landing pages = open job pages and the free tools (job alerts, WhatsApp/Telegram join), not the ₹299 bundle; watch GA4 `purchase` vs the Razorpay dashboard for a week; then decide on H4 and scale.

## Final summary

| # | Item | Value |
|---|---|---|
| 1 | Total issues found | **22** (1 critical, 5 high, 9 medium, 7 low) + info/optional items |
| 2 | Critical | 1 (C1) |
| 3 | High | 5 (H1 sitemap, H2 store webhook gap, H3 missing PDFs, H4 permanent download link, H5 SPA-shell HTML) |
| 4 | Medium | 9 (M1 headers/CSP, M2 www duplicate, M3 soft-404, M4 GA4 double `page_view`, M5 GA4 events missing, M6 verify→Failed, M7 free checkout, M8 job data gaps, M9 JWT in localStorage) |
| 5 | Low | 7 (L1 meta lengths, L2 quantity, L3 download race, L4 counter inflation, L5 contact rate-limit, L6 `.vs` tracked, L7 http-only outbound links) |
| 6 | Fixed (code, verified **locally**, **not deployed**) | **7**: C1, H2, M4, M5, M6, M7, L2 — plus the API half of the security headers |
| 7 | Config delivered, not applied | 3: H1, M1, M2 (`deploy/nginx-jobcharcha.conf.example`) |
| 8 | Remaining | 12 + the not-yet-deployed fixes (see report 09) |
| 9 | Tests created | **12** backend cases + **38** E2E tests (Playwright) |
| 10 | Tests passed | Backend **346/346**; E2E local **35 passed**; live read-only subset **4 passed** |
| 11 | Tests failed | Backend 0; E2E local 0; **live 6 failed — the six are the real production defects** (sitemap ×2, security headers ×2, paid-link leak ×2) |
| 12 | Skipped | E2E local **3** (production-only ×2, admin-login needs credentials) |
| 13 | External verification required | Search Console; GA4 DebugView/Realtime and Ads conversions; Razorpay dashboard webhook config; browser sandbox purchase; prerender + uploads persistence on the server; `FrontendBaseUrl` in prod; WCAG/Lighthouse; non-admin vs admin routes |
| 14 | WebsiteValidator score before | 90/100 (as stated; report file not provided) |
| 15 | WebsiteValidator score after | **Not re-tested** — nothing deployed yet |
| 16 | Business readiness | **NOT READY** today → LIMITED PILOT once blockers 1–5 are done and verified |

## Caveats you should know

- The live checks were read-only GETs plus two forged webhook calls and unauthenticated checkout probes that the server rejected; expect two `webhook.signature_*` rows in `PaymentLogs` dated 2026-10-06.
- The live product-API response (which contained the Drive links) was printed once to this session's terminal during testing; I did not copy it into any file. Another reason to replace those links.
- My local API instance was started by me on :5101 (output in the session scratchpad). The local DB may be the same one production uses; the audit wrote nothing to it.

---

## Update 2026-10-06 (evening) — re-verified on the live site

Re-run: `E2E_BASE_URL=https://jobcharcha.com E2E_API_URL=https://jobcharcha.com npx playwright test seo-and-hosting store-payments-security --project=desktop` → **10 passed, 1 failed** (was 4 passed / 6 failed).

| Blocker | Status now |
|---|---|
| C1 paid Drive links in `/api/products` | **Fixed on live** (`googleDriveDownloadUrl: null`). Owner reports the three Drive links were replaced. |
| H1 `/sitemap.xml` | **Fixed** (real XML, 200) |
| M1 security headers | **Fixed** (HSTS, nosniff, X-Frame-Options, Referrer-Policy present) |
| M2 `www` duplicate | **Fixed** (nginx config rewritten; `www` → 301 → apex) |
| Uploads / notification PDFs | `wwwroot/uploads` restored after a bad redeploy; sample PDF returns 200 via `jobcharcha.com/uploads/...` |
| H5 per-page HTML (title/canonical/OG) | **STILL OPEN.** `/jobs/tiss-non-teaching-bharti-2026-16-posts` returns the generic homepage title, no canonical, no OG, no JSON-LD in raw HTML. Shared job links will preview generically. Run/restore `deploy/prerender.sh` and re-check. |
| H2 Razorpay webhook + test purchase | Not verified (needs owner) |
| H3 missing notification PDFs | Not re-checked in full |
| H4 permanent shareable download link | Unchanged |

Remaining test failure: API sends `X-Content-Type-Options: nosniff, nosniff` (API and nginx both add it). Harmless; fix with `proxy_hide_header X-Content-Type-Options;` in the nginx `/api/` block.

Social auto-share: Instagram image generation was failing on the server (missing SkiaSharp assembly / stale `deps.json`, then SqlClient stub after a mixed deploy). Both resolved by a clean `-r linux-x64` publish. Telegram from the server was timing out (`api.telegram.org` unreachable) — not resolved.

**Status now: LIMITED PILOT is reasonable once H5 (prerender) and one Razorpay test purchase are done.**
