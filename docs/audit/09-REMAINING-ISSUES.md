# 09 — Remaining issues

Severity · class · what to do. **"Blocker"** = must be resolved before spending on ads (see report 10).

## Blockers (production still has these today)

| ID | Sev | Class | Issue | Action |
|---|---|---|---|---|
| C1 | **CRITICAL** | CONFIRMED BUG | The paid-file leak is **live in production**; the fix exists only in this working tree | Commit → deploy API → re-run the live E2E (`store-payments-security`). **Then replace all three Drive sharing links** — they were publicly exposed in an API response and must be treated as compromised |
| H1 | **HIGH** | CONFIGURATION | Live `/sitemap.xml` returns HTML | Apply the `location = /sitemap.xml` block from `deploy/nginx-jobcharcha.conf.example`; submit the sitemap in Search Console |
| H5 | **HIGH** | SEO / REQUIRES EXTERNAL VERIFICATION | Live pages are served as the bare SPA shell: no per-page title/canonical/OG/JSON-LD in raw HTML → generic previews on WhatsApp/Telegram/Facebook | Check the prerender timer and output on the server (`systemctl status jobcharcha-prerender.timer`; `…/current/jobs/<slug>/index.html`). This matters most if ads link to job pages that people then share |
| H2 (deploy half) | **HIGH** | REQUIRES EXTERNAL VERIFICATION | New webhook fulfilment only works if Razorpay actually sends `payment.captured`/`order.paid` to `/api/payments/webhook` with the right secret | Confirm in the Razorpay dashboard; do the sandbox purchase + closed-tab test (report 05) |
| H3 | **HIGH** | CONFIRMED BUG (data/hosting) | 20 uploaded official-notification PDFs 404 on live (≥1 on an open job); cause unverified | Check `FileStorage:RootPath` points outside the release folder and is backed up; re-upload the PDFs for open jobs first (list: report 02) |

## Other open items

| ID | Sev | Class | Issue | Action |
|---|---|---|---|---|
| H4 | HIGH | SECURITY HARDENING | Paid download = permanent shareable Drive URL | Medium-term: signed expiring URLs from R2/S3 or authenticated streaming. Short-term acceptable for low-priced PDFs with eyes open |
| M1/M2 | MEDIUM | CONFIGURATION | HTML security headers, CSP, www duplicate host | nginx example (not applied). Run CSP Report-Only first |
| M3 | MEDIUM | SEO | Unknown URLs return 200 (the 404 page is `noindex`) | Leave unless Search Console shows Soft 404 at scale |
| M8 | MEDIUM | DATA | 1 job with no apply *and* no notification link (`systems-gmrc-bharti-2026-29-posts`); 25 without notification URL; 17 without apply URL; 6 without vacancy count; 5 plain-http links | Editorial review in Admin; not auto-edited |
| M9 | MEDIUM | SECURITY HARDENING | JWTs in `localStorage` | Architecture change (HttpOnly cookies + CSRF handling); not a stabilisation fix |
| — | MEDIUM | REQUIRES EXTERNAL VERIFICATION | `App:FrontendBaseUrl` must be `https://jobcharcha.com` in production (sitemap/canonical/OG base); GA4 events; Search Console | Verify after deploy |
| L1 | LOW | SEO | `metaDescription` > 170 chars on 90 jobs, `metaTitle` > 70 on 76 | Editorial |
| L3 | LOW | BUG | Download counter not atomic (can exceed limit by 1 under a double-click race) | Optional |
| L4 | LOW | HARDENING | Anonymous free-library download counters can be inflated | Optional |
| L5 | LOW | HARDENING | Contact form has only the global rate limit | Add a policy |
| L6 | LOW | HYGIENE | `backend/.vs/` tracked in git | `git rm -r --cached backend/.vs` |
| — | INFO | MARKETING | **Only 21 of 237 listed jobs are open** (the rest are `Expired`) | Point ads at open jobs / evergreen pages; keep inventory fresh |
| — | INFO | FEATURE GAP | No admin order list endpoint was found (only refund); revenue totals are product counters, not a ledger | Reconcile against the Razorpay dashboard; add an order list only if needed |
| — | OPTIONAL | SEO | Organization / WebSite / BreadcrumbList schema | Add only with real logo + social URLs from you |
| — | REQUIRES MANUAL TEST | — | Browser sandbox purchase, WCAG audit, Lighthouse, non-admin session vs admin routes | See report 07 |

## Not applicable / rejected scanner suggestions

Fake Organization/social URLs, ratings or reviews; Product/Article schema on job pages; FAQ schema on pages without FAQs; an enforcing CSP applied blind (could break checkout/analytics).
