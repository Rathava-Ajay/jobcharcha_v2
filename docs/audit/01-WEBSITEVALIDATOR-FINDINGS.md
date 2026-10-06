# 01 — WebsiteValidator findings, triaged against the real application

**Audit date:** 2026-10-06 · **Scope:** https://jobcharcha.com (live) + this repository (React/Vite SPA, .NET 8 API, nginx, SQL Server).

## What I had and did not have

- The request quoted a WebsiteValidator score of **90/100** but **no report file was attached**, so I could not read its individual findings.
- I therefore did **not** triage the scanner's own wording. Instead I probed every area the request lists (headers, canonical, schema, sitemap, robots, forms, redirects, caching) directly against the live site and the source, and recorded what is actually true.
- **Score before: 90/100 (as stated by the requester). Score after: NOT RE-TESTED** — nothing has been deployed yet, so a re-test now would measure the old site.

> The 90/100 is not a readiness score. The scanner is a public, logged-out crawl: it cannot see that the paid files were downloadable by anyone, that the sitemap URL returns HTML, or that Razorpay store payments had no webhook fallback.

## Scanner-area triage (verified against the real site/code)

| Area from the brief | What is actually true | Verdict | Class |
|---|---|---|---|
| Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy | **None are sent** on `https://jobcharcha.com/` (live `curl -I`: only Server/Content-Type/ETag). The API now sends nosniff / Referrer-Policy / X-Frame-Options (verified locally); the HTML is served by nginx, which is not in the repo | Real. Fix delivered as `deploy/nginx-jobcharcha.conf.example` (not applied) | CONFIGURATION ISSUE · MEDIUM |
| Content-Security-Policy | Absent. Site legitimately loads GA/Ads (gtag), AdSense, Razorpay Checkout (script + iframe), Google Fonts and inline bootstrap scripts | **Do not enforce blind.** Provided as `Content-Security-Policy-Report-Only` with the real allow-list; promote after a few days of real traffic | SECURITY HARDENING · OPTIONAL→MEDIUM |
| Canonical URL | `SeoHead` sets one canonical per page client-side. **Raw HTML of live job pages is the bare SPA shell** (4,314 bytes, no canonical/OG/JSON-LD) — see finding H5 in report 04 | Real, bigger than a canonical tweak | SEO IMPROVEMENT · HIGH |
| sitemap | **`/sitemap.xml` on the live site returns HTML**, not XML | Real, critical for SEO | CONFIGURATION ISSUE · HIGH |
| robots.txt | Present, sane (blocks `/admin/`, `/dashboard/`, `/login`; declares the sitemap) | OK | — |
| Structured data: JobPosting | Implemented on job pages (govt + private); E2E validates required fields | OK | — |
| Structured data: FAQPage | Emitted on job/result/admit-card pages **only where FAQ content exists** | OK — do not add elsewhere | — |
| Structured data: Organization / WebSite / BreadcrumbList | **Absent site-wide** | OPTIONAL. Needs facts only the owner has (logo URL, real social profile URLs). I did **not** add placeholders. SearchAction only if a real search URL is confirmed | SEO IMPROVEMENT · OPTIONAL |
| Structured data: Article/Product | Not applicable to job/result pages; Product schema on `/store` would need real review/offer data | NOT APPLICABLE | FALSE POSITIVE / NOT APPLICABLE |
| Open Graph / Twitter | Set client-side by `SeoHead`; **not in raw HTML** (social crawlers do not run JS) | Real for link previews (WhatsApp/Telegram/Facebook) | SEO IMPROVEMENT · HIGH (part of H5) |
| Form labels / autocomplete | Login: `autocomplete="email"` / `current-password` / `new-password` present (E2E asserts it) | OK for login; other forms not individually audited | — |
| Cache-Control | Hashed assets are `immutable` per the README; HTML should be `no-cache` so a fresh prerender is picked up | Provided in nginx example | CONFIGURATION ISSUE · LOW |
| Accessibility | Spot checks only (labelled login fields, landmarks, 44px targets in new UI). **No WCAG audit was run** | REQUIRES MANUAL TEST | REQUIRES MANUAL TEST |
| Performance | Not scored by me from the scanner; see report 03/09 for code-level notes. Lighthouse not run | REQUIRES MANUAL TEST | REQUIRES MANUAL TEST |
| "AI/agentic accessibility" | Not a business-readiness item | OPTIONAL | OPTIONAL |

## Recommendations deliberately NOT implemented

- Fake/placeholder `Organization.sameAs` social URLs, ratings, reviews, `Product` or `Article` schema on unrelated pages.
- An enforcing CSP (could silently break checkout or analytics).
- Hard 404 for unknown URLs (would 404 brand-new job pages for the minutes before the prerender job writes them; the NotFound page is `noindex`). Documented in the nginx example.
