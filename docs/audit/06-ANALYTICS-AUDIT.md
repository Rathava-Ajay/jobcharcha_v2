# 06 — Analytics audit (GA4 `G-BQHGCRK48X`, Google Ads `AW-17821775814`)

**Live GA4 data / DebugView / Realtime: REQUIRES EXTERNAL VERIFICATION.** I audited the implementation in source and the local build; I cannot see GA4.

## Before

| Event | State |
|---|---|
| `page_view` | **Double-counted on first load.** `index.html` ran `gtag('config', 'G-…')` with the default `send_page_view: true`, and `AnalyticsPageView` fired another `page_view` on mount → every landing = 2 page views, inflating views and deflating engagement/conversion rates |
| `purchase` (GA4) | **Missing.** Only a Google Ads `conversion` event fired (`trackPDFPurchase`) → no purchase/revenue in GA4 reports |
| `begin_checkout`, `view_item`, `download`, `job_view`, `job_apply_click`, `official_notification_click` | Missing |
| Ads conversions (`trackPDFPurchase`, `trackWhatsAppJoin`, `trackEmailSignup`) | Present; PDF purchase carried `value`, `currency: INR`, `transaction_id` (order id) — correct |
| Duplicate-firing guard for purchase | None |

## Changes (all in `src/`, `index.html`; verified by `tsc` + build; behaviour in GA4 itself is unverified)

- `gtag('config', 'G-…', { send_page_view: false })` → exactly one `page_view` per route, including the first.
- `trackPDFPurchase(value, transactionId, items?)` now also sends GA4 **`purchase`** (`transaction_id`, `value`, `currency: INR`, `items`) and is **de-duplicated per order id per session**; the Ads conversion is unchanged. Paid orders only (`value > 0` for the GA4 event).
- New: `view_item` (product opened), `begin_checkout` (pay pressed with a non-empty cart; both Razorpay and wallet), `download` (after the server authorises a download), `job_view` (job detail loaded), `job_apply_click` / `official_notification_click` (one delegated click listener on the job page matching the job's real `applyUrl` / `officialNotificationUrl`, so every layout is covered).
- All sends are wrapped in try/catch: analytics can never break a page.
- `value` for purchase comes from the same cart total the server just verified; items carry catalogue price. Currency is always INR.

## Not implemented (no clear app support, no fake conversions)

- `search`: the jobs search is a client filter with no single clear submit point; GA4 Enhanced Measurement "site search" can be enabled in the GA4 UI instead (needs the real query parameter).
- Server-side purchase (Measurement Protocol) for buyers who never return to the site after paying — would improve revenue accuracy but is a new integration.
- `payment_success` as a separate event: it is identical to `purchase`; I did not create a duplicate.

## To verify after deploy (REQUIRES EXTERNAL VERIFICATION)

GA4 → DebugView: one `page_view` per navigation; `view_item` → `begin_checkout` → `purchase` (with `transaction_id` = order id) in a **test-mode** order; `job_view` and `job_apply_click` on a job page. In Google Ads confirm the three conversion actions still receive events and that `purchase` is *not* also imported as a second Ads conversion.
