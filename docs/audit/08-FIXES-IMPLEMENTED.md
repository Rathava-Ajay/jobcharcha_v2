# 08 — Fixes implemented

**Everything here is in the working tree only.** Nothing has been committed, deployed or applied to the server. "Verified" means verified locally (unit tests, API probe, `tsc`, production build, E2E) — not in production.

| ID | Fix | Files | Verified by |
|---|---|---|---|
| **C1** | Public product endpoints no longer return `GoogleDriveDownloadUrl` / `GoogleDriveViewUrl`; the admin list still does (the admin edit form needs them) | `ProductService.cs` (`ToDto(p, includeFileLinks)`) | Unit test; local API: **0 of 3** products leak (was 3 of 3); E2E (API + browser) |
| **H2** | Razorpay webhook now settles **store orders** on `payment.captured` / `order.paid`, only when amount and currency equal the server-side order; exactly-once with `/verify` via shared apply logic; mismatches logged, not fulfilled | `StoreOrderService.FulfillCapturedAsync`, `IStoreOrderService`, `PaymentService.HandleWebhookAsync` (optional `IStoreOrderService` ctor parameter, default null so existing tests/constructors compile) | 7 unit tests (settle once, duplicate delivery, wrong amount, wrong currency, unknown order, webhook→late verify, bad-verify→webhook) |
| **M6** | Invalid `/verify` signature no longer sets the order to `Failed`; stays `Pending`, failure logged | `StoreOrderService.VerifyAsync` | Updated test + new test |
| **M7** | ₹0 carts settle directly (`PaymentMethod = "free"`) instead of failing at Razorpay / dereferencing a missing wallet | `StoreOrderService.CompleteFreeOrderAsync` | Unit tests for `razorpay` and `wallet`, no wallet row |
| **L2** | Quantity clamped to 1–10 | `StoreOrderService` | Unit test |
| **M4** | GA4 first-landing `page_view` no longer double-counted (`send_page_view:false`) | `index.html` | Source review; **GA4 DebugView to confirm after deploy** |
| **M5** | GA4 `purchase` (de-duplicated per order), `begin_checkout`, `view_item`, `download`, `job_view`, `job_apply_click`, `official_notification_click`; all wrapped so analytics cannot break a page | `src/utils/analytics.ts`, `ECommerceMarketplaceSection.tsx`, `JobDetailsPage.tsx` | `tsc`, production build, E2E (no console errors); **GA4 to confirm** |
| **S3 (API half)** | API responses send `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` (SAMEORIGIN because the site embeds its own PDFs) | `Program.cs` | Local `curl -I` + E2E |

## Delivered as configuration (not applied — needs a server change by you)

`deploy/nginx-jobcharcha.conf.example`: sitemap proxy to the API (**H1**), www→bare 301 (**M2**), HSTS / nosniff / X-Frame-Options / Referrer-Policy / Permissions-Policy, CSP in **Report-Only** with the real allow-list (GA/Ads, AdSense, Razorpay script+iframe, Fonts), cache headers, and a documented reason for *not* hard-404ing unknown URLs.

## Not touched on purpose

Job/result content and publishing rules, URLs, DB schema (no migration), the refund flow, wallet/plan/test payments, auth, the social auto-share system, Org/WebSite schema (needs owner-supplied facts), any CSP enforcement.

## Test changes

`StoreOrderServiceTests`: one assertion changed (`Failed` → `Pending`) to match the corrected behaviour. `StoreSecurityTests` added. Playwright suite added (see report 07). One dependency added: `@playwright/test`.

## Addendum (second pass, same day)

| ID | Fix | Verified by |
|---|---|---|
| Gap | **Admin order visibility:** new `GET /api/admin/store-orders?status=&page=&pageSize=` (Admin/SuperAdmin) returns orders newest-first with Razorpay order/payment ids, per-status counts and **verified revenue (Paid orders only)** | Unit test `AdminOrderList_SeparatesPaidFromPending_AndCountsOnlyPaidAsRevenue`; backend now **346/346** |
| L5 | Contact form uses the existing 10/min/IP rate-limit policy | build + tests |
| L6 | `backend/.vs/` untracked from git (staged deletion; commit to apply) | `git rm --cached` |

Still impossible from this environment (no SSH key or server access): deploying, applying nginx, replacing the Drive links, Razorpay dashboard, prerender/uploads on the server.
