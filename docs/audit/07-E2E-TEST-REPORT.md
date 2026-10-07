# 07 — E2E and automated test report

## What was created

**Playwright** (`@playwright/test@1.62.1`, pinned to the already-installed `playwright` so the existing Chromium keeps working — the only new dependency) · `playwright.config.ts` · `e2e/` · scripts `npm run test:e2e`, `npm run test:e2e:report`.

| File | Journeys |
|---|---|
| `e2e/public-journeys.spec.ts` | Homepage (title, landmark, **no console errors**), job listing → detail, job detail (apply / official-notification links absolute + `rel=noopener`, indexable), canonical + OG + valid `JobPosting` JSON-LD, search, results, admit cards, store, study library, result/admit-card detail, unknown URL → 404 page + `noindex` |
| `e2e/auth-admin.spec.ts` | Login form labels/autocomplete, wrong credentials rejected with no stored token, `/dashboard/admin` and `/admin/mobile-post` unusable when logged out, 6 admin GET endpoints → 401, admin POST/PUT/DELETE with **no token and a forged JWT** → 401, optional seeded-admin sign-in (env-gated) |
| `e2e/store-payments-security.spec.ts` | Public product APIs never contain Drive links (API **and** browser-loaded responses), checkout/verify/my-orders/download/payments → 401 logged-out, forged and unsigned Razorpay webhook → 400, add-to-cart without paying, study library has no paid links |
| `e2e/seo-and-hosting.spec.ts` | API sitemap valid XML; **website** `/sitemap.xml` is XML (prod only); `robots.txt`; API security headers; HSTS/nosniff/frame headers and www→bare 301 (prod only) |
| `e2e/mobile.spec.ts` (Pixel 7) | No horizontal overflow, hamburger menu → Jobs, job detail usable on a phone, store renders |
| `e2e/fixtures.ts` | Auto-collects console errors, failed requests and 4xx/5xx responses for every test and **attaches them as `evidence.json` on failure**; Playwright adds screenshot, video and trace (`retain-on-failure`) |

**Backend:** `JobPortal.Tests/StoreSecurityTests.cs` — 12 new test cases (leak, download authorisation matrix, download limit, other-user verify, webhook settle/duplicate/wrong amount/wrong currency/unknown order, browser-closed-then-late-verify, bad signature then webhook, server pricing + quantity clamp + unknown product, free cart via both methods). 1 existing test updated to the new (correct) behaviour.

## Results

| Run | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|
| Backend unit/integration (`dotnet test`) | **345** | 0 | 0 | was 333 before this audit (333 → 345 = the 12 new cases; 1 existing test re-pinned) |
| E2E, **local** stack (Vite :3000 + API :5101), desktop + mobile, full run | **34** | 0 | 4 | 38 defined. After the full run the add-to-cart journey was un-skipped (it checked for products before they loaded) and passed in an isolated re-run → **35 passed / 3 skipped** |
| E2E, **live production**, read-only subset (`seo-and-hosting`, `store-payments-security`, desktop) | 4 | **6** | 1 | **These 6 failures are the point** — they are the defects the suite was written to catch (below) |

**First local run honestly:** 29 passed / 2 failed / 3 flaky. Both failures were *my test mistakes* (wrong route `/api/study-materials`; an ambiguous "jobs" link that matched the account tile) and the flakiness was dev-server load; I fixed the tests and added explicit readiness waits. No product defect was hidden by editing a test.

**Live run — the 6 expected failures:** `/sitemap.xml` returns `text/html` (×2), no `nosniff`, no HSTS / www redirect, and paid Drive links in the public product API (×2, API and browser). They should all turn green after the deploy + nginx steps; re-run:

```
E2E_BASE_URL=https://jobcharcha.com E2E_API_URL=https://jobcharcha.com npx playwright test seo-and-hosting store-payments-security --project=desktop
```

**Skipped (by design):** seeded-admin sign-in (needs `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`), website sitemap + production-header checks on localhost (no nginx locally).

## Not covered by automation — REQUIRES MANUAL TEST

1. **Razorpay sandbox checkout in the browser** (modal, UPI/card, success, failure, cancel, closing the tab mid-payment). Needs test keys + an interactive session; money-path *logic* is covered by the backend tests with a faked Razorpay client.
2. A logged-in **non-admin** session probing admin routes (needs a throw-away user; not created on a shared database).
3. Paid download **in a browser** after a real/test purchase.
4. Screen-reader / WCAG audit, Lighthouse performance, real-device mobile.
5. Search Console, GA4 DebugView.

## Evidence locations

`e2e-report/index.html` (HTML report), `e2e-results/` (screenshots, videos, traces), `e2e-results.json` — all git-ignored, regenerated on each run (`npm run test:e2e:report` to open).
