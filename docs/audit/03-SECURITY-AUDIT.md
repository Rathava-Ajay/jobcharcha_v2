# 03 — Security audit

No real secret value appears in this report or in any file I created. Where a secret-like value was found I record only its **location and shape**.

| # | Finding | Class / Severity | Status |
|---|---|---|---|
| S1 | **Paid-file links public:** `GET /api/products` and `/api/products/{slug}` returned `googleDriveDownloadUrl` / `googleDriveViewUrl` for every product, paid included, to anonymous callers. **Confirmed on production** (all 3 paid products). | CONFIRMED BUG · **CRITICAL** | **Fixed in code**, verified locally (0 of 3 expose links). **Not deployed.** After deploy, treat the old Drive links as compromised and replace them (see report 05) |
| S2 | Download links are **permanent Drive URLs** handed to any paying user: once obtained they can be shared forever; no expiry, no per-user binding | SECURITY HARDENING · HIGH | Remaining. A real fix needs hosting changes (signed expiring URLs from R2/S3 or authenticated streaming). Not a "small safe change" |
| S3 | HTML responses carry **no security headers** (HSTS, nosniff, X-Frame-Options, Referrer-Policy, CSP) | CONFIGURATION ISSUE · MEDIUM | API middleware added + verified; nginx config provided in `deploy/nginx-jobcharcha.conf.example`, **not applied** |
| S4 | CSP absent | SECURITY HARDENING · MEDIUM | Report-Only policy provided (real allow-list: gtag/Ads, AdSense, Razorpay, Fonts) — do not enforce blind |
| S5 | JWT access/refresh tokens in `localStorage` (`src/api/client.ts`) → readable by any XSS | SECURITY HARDENING · MEDIUM | Remaining. Mitigated by DOMPurify on rendered HTML (below). Moving to HttpOnly cookies is an architecture change — not done |
| S6 | Contact form has no dedicated rate-limit policy (global 300/min/IP applies) | SECURITY HARDENING · LOW | Remaining |
| S7 | `backend/.vs/` IDE config is tracked in git (contains no secrets I could see) | LOW | Remaining (`git rm -r --cached backend/.vs`) |

## Checked and fine

- **Secrets:** tracked config files are only `*.Example.*`; real `appsettings.*.json` are git-ignored. `TESTING_REPORT.md` shows Razorpay keys, but they are literal placeholders (`placeholder_razorpay_…`). No real keys found in tracked source.
- **SQL injection:** zero `FromSqlRaw` / `ExecuteSqlRaw` / interpolated SQL outside migrations; EF Core parameterises everything. Product search uses `EF.Functions.Like` with parameters.
- **XSS:** the only `dangerouslySetInnerHTML` is `SafeHtml.tsx`, which wraps `DOMPurify.sanitize`.
- **CSRF:** the API authenticates by `Authorization: Bearer` header, not cookies, so classic CSRF does not apply.
- **CORS:** explicit allow-list from `Cors:AllowedOrigins`, no `AllowAnyOrigin`; startup logs a warning if it still contains localhost in Production.
- **Brute force:** `auth` rate-limit policy (10/min/IP) on all auth endpoints; client IP comes from trusted `X-Forwarded-*` (same-host nginx).
- **Errors:** Production uses a generic JSON 500 and logs the real exception server-side; Swagger and the developer exception page are Development-only.
- **HTTPS:** `UseHsts` + `UseHttpsRedirection` in Production; live http→https is a 301.
- **Uploads:** admin-only, 20 MB cap, extension **and** content-type allow-list, server-generated GUID filenames (no path traversal via filename).
- **Payments:** HMAC-SHA256 signature checked with constant-time comparison; amounts always recomputed from the catalogue server-side (see report 05).
- **Webhook:** signature mandatory; forged/unsigned requests return 400 (E2E, local **and** live).
- **IDOR:** `GetDownloadUrlAsync` and `VerifyAsync` filter by the authenticated user id; unit-tested (other user, forged item id, guessed order id → NotFound).

## Side effect of testing production (disclosed)

My read-only live run sent two unauthenticated requests to `POST /api/payments/webhook` (no signature / bad signature). Both were rejected with 400. The service logs rejected webhooks, so **expect two `webhook.signature_missing` / `webhook.signature_invalid` rows in `PaymentLogs`** from 2026-10-06. No order or payment state was touched.
