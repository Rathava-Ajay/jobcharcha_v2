# 02 — Business functionality audit (jobs, data accuracy, admin, results, admit cards, study material)

Method: source review + **read-only** scan of the live public API (237 jobs) + local Playwright journeys. No production data was created or changed.

## A. Job workflow

| Check | Result |
|---|---|
| Public listing → category/search → detail | Passes E2E locally (listing links to `/jobs/:slug`; detail renders `h1`; search with no matches empties the list) |
| Detail page content | Apply link and official-notification link render as real `<a>` with `rel="noopener…"` (E2E asserts) |
| SEO per job | One canonical, OG title, meta description, valid `JobPosting` JSON-LD with title/description/datePosted/hiringOrganization/jobLocation (E2E asserts) — but see report 04 H5 (raw HTML is the SPA shell on live) |
| Expiry | The API marks old jobs `status = "Expired"` automatically. **Only 21 of 237 jobs are open** (last date today or later) |
| Duplicates | 0 duplicate titles across 237 jobs |
| Slugs | Unique, readable; no empty slugs |
| Admin publish → live → prerender | Mechanism exists (flag file + systemd timer, README). **Not verifiable from here** that the timer runs on the server — see H5 |

## B. Data accuracy (live data, all 237 jobs, read-only)

| Finding | Count | Class | Severity |
|---|---|---|---|
| Uploaded **official notification PDFs returning 404** on `jobcharcha.com` (`/uploads/notifications/*`, `/uploads/pdfs/*`) | **20 jobs** (at least 1 is an *open* job, last date 2026-11-03) | CONFIRMED BUG (data/hosting) | **HIGH** |
| Jobs with **neither** apply link nor notification link | 1 (`systems-gmrc-bharti-2026-29-posts`) | CONFIRMED BUG (data) | MEDIUM |
| Jobs with no official notification URL | 25 | data completeness | MEDIUM |
| Jobs with no apply URL | 17 | data completeness (may be offline-application jobs) | LOW–MEDIUM |
| Jobs with no vacancy count | 6 | data completeness | LOW |
| Jobs with no official website | 91 | data completeness | INFO |
| Jobs whose outbound link is plain `http://` | 5 | data hygiene | LOW |
| `metaDescription` > 170 chars / `metaTitle` > 70 chars | 90 / 76 | SEO (truncated in results) | LOW |
| Missing last date / qualification / meta description | 0 / 0 / 0 | OK | — |

**Link health sample (60 unique outbound links):** 51 OK, 9 problems — 6 are our own missing uploads (above), 1 network/DNS error on an external site, and 2 external responses (a 403 and a 404 from bank sites that often block scripted requests — **REQUIRES MANUAL TEST**). I did not change any job content.

**Root cause of the missing PDFs is unverified** (REQUIRES EXTERNAL VERIFICATION on the server): the files are referenced by the database but absent on disk. The usual cause is the uploads folder living inside the published API directory and being replaced on redeploy. Check `FileStorage:RootPath` on the server points outside the release directory and is backed up.

## C. Admin

| Check | Result |
|---|---|
| Every controller write endpoint (POST/PUT/PATCH/DELETE) is behind auth | Scripted over all controllers: the only anonymous writes are login/register/refresh/forgot/reset/confirm-email/resend, contact form, quiz submit, the two free-library download counters, and the signed Razorpay webhook — all expected |
| Admin routes require Admin/SuperAdmin role | Yes (`[Authorize(Roles=…)]`); no admin route is guarded by a bare `[Authorize]` |
| Logged-out / forged JWT | E2E: admin GETs → 401; admin POST/PUT/DELETE with no token **and** with a forged JWT → 401 |
| Admin UI directly by URL when logged out | `/dashboard/admin` bounces; `/admin/mobile-post` shows no editor (E2E) |
| Role separation (aspirant → admin) | Server enforces roles on every admin endpoint; **a logged-in non-admin session was not exercised** (would require creating a user — not done on a shared DB). REQUIRES MANUAL TEST |
| Session expiry | JWT `ValidateLifetime=true`, 1-min skew, refresh endpoint exists; not time-travel tested |

## D. Results, admit cards, study material

- Results and admit-card list + detail pages load (E2E). FAQ JSON-LD is emitted only when FAQ content exists.
- **Study library** (`/api/study-materials`) is a *free* library by design: no price, anonymous download counter. Not a leak. The counter can be inflated by anyone (LOW).
- **Store products** (paid PDFs) are a separate system — see report 05. The critical leak was there.

## Not changed (per "no rule changes unless a real defect")

Expiry rules, slug rules, publishing workflow, category logic, data content. Job data issues above are reported, not edited.
