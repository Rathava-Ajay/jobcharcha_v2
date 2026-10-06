# 05 — Payment, orders, revenue and download audit

No real payment was made. The Razorpay modal and a sandbox purchase were **not** exercised in a browser (needs test keys and an interactive session) → **REQUIRES MANUAL TEST**. Everything else is proven by unit tests with a faked Razorpay client plus unauthenticated/forged-request E2E.

## Flow as implemented

`Cart → POST /api/store/orders/checkout` (server prices the cart, creates a Pending order + Razorpay order) `→ Razorpay modal → POST /api/store/orders/verify` (HMAC-SHA256 of `order_id|payment_id`, constant-time compare, one DB transaction: Paid + download tokens + product counters) `→ GET /api/store/orders/{id}/download/{itemId}` (must be the owner, order Paid, under `MaxDownloadCount`) `→ Drive URL`.

## Findings

| # | Finding | Class / Severity | Status |
|---|---|---|---|
| **C1** | **Anyone could download paid files without paying**: public product endpoints returned the Google Drive download/view URL for every product. Confirmed live (3 of 3 paid products: ₹49, ₹99, ₹299; two have recorded sales). | CONFIRMED BUG · **CRITICAL** | **Fixed**: public DTOs null the links; admin list keeps them for editing. Unit-tested (`PublicProductApis_NeverExposeThePaidFileLinks…`) and verified on the local API. **Not deployed.** |
| **H2** | **Paid-but-locked buyers:** the Razorpay webhook only knew plan/test/wallet payments (`AspirantPayments`). A store buyer who paid and closed the browser before `/verify` stayed `Pending` forever; the hourly reconciliation sweep also covers only `AspirantPayments`. | CONFIRMED BUG · **HIGH** | **Fixed**: webhook `payment.captured`/`order.paid` now settles a matching store order via `FulfillCapturedAsync`, only if **amount and currency equal the server-side order** (mismatch → logged `webhook.amount_mismatch`, not fulfilled). Exactly-once with `/verify` (shared apply logic, unique `RazorpayPaymentId` index, concurrency catch). Unit-tested incl. duplicate delivery, wrong amount, USD, unknown order, verify-after-webhook |
| **H4** | The download URL is a **permanent shareable Drive link** (see report 03 S2) | SECURITY HARDENING · HIGH | Remaining (needs signed/expiring URLs or authenticated streaming) |
| M6 | A **bad `/verify` signature permanently set the order to `Failed`** — a glitchy/tampered call could strand a buyer who then really paid | CONFIRMED BUG · MEDIUM | **Fixed**: order stays `Pending`, failure logged. Test updated + `ABadVerifySignature_DoesNotStopTheWebhookFromSettlingARealPayment` |
| M7 | **Free product checkout was broken**: Razorpay rejects a ₹0 order, and the wallet path dereferenced a missing wallet row | CONFIRMED BUG · MEDIUM (latent: all 3 live products are paid) | **Fixed**: ₹0 carts settle directly as `PaymentMethod="free"` with tokens/counters. Tested for both methods, no wallet row |
| L2 | Cart quantity unbounded (price was always server-side, so no revenue impact) | LOW | **Fixed**: clamped to 1–10 |
| L3 | Download counter increment is not atomic; two simultaneous clicks can exceed `MaxDownloadCount` by one | LOW | Remaining |

## Checklist from the brief

| Requirement | Result |
|---|---|
| Successful payment → exactly one valid order | Yes (verify + webhook idempotent; counters incremented once — tested) |
| Failed payment never becomes successful | Yes; bad signature leaves Pending, never Paid |
| Duplicate/repeated callbacks | No double count (tested: same webhook twice; verify after webhook) |
| Order amount server-verified | Yes (catalogue price × clamped qty; webhook amount must equal it) |
| Wrong order id / another user's order | `NotFound`, order unchanged (tested) |
| Manipulated amount | Client never sends an amount for store orders; webhook amount mismatch rejected (tested) |
| Product/order relationship, payment id stored | `OrderItems` snapshot title/slug/price; `RazorpayPaymentId` stored, unique index |
| Refund handling | `AdminRefundAsync` exists: Razorpay refund → status `Refunded` → downloads revoked → product counters netted. Not changed |
| Admin can identify successful/failed orders | `PaymentStatus` + `PaymentLogs` events exist; there is **no admin order list endpoint in the controllers I audited** (only refund) — INFO |
| Revenue totals from verified orders | Product `TotalSales/TotalRevenue` change only on Paid and are netted on refund. Counters, not a ledger: **reconcile against the Razorpay dashboard** |
| Unpaid / other user / guessed IDs / logged-out download | All refused (unit tests + E2E 401) |
| Expired/invalid download URL, copied URL | N/A by design: there is no per-user URL. A copied **Drive** URL works forever → H4 |
| Refresh after payment / browser closed mid-payment | Handled by the new webhook path (H2), provided Razorpay delivers the event |

## Must do externally before ads

1. **Deploy this build**, then **replace the three Drive files' sharing links** (re-share or upload a fresh copy and update the product in Admin). The old links were publicly exposed in an API response and must be treated as compromised.
2. In the Razorpay dashboard confirm the webhook URL `https://jobcharcha.com/api/payments/webhook` is active, its secret equals `Razorpay:WebhookSecret`, and it is subscribed to `payment.captured` (and/or `order.paid`) — **REQUIRES EXTERNAL VERIFICATION**. See `deploy/RAZORPAY-CONFIG-FIX.md`.
3. Run **one sandbox/test-mode purchase** end-to-end in a browser (checkout → pay → My Orders → download), then close the tab mid-payment on a second test purchase and confirm the order settles from the webhook.
