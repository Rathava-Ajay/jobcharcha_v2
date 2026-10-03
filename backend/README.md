# JobPortal.Api — Phase 1 backend

ASP.NET Core Web API (.NET 10) backing the React frontend. Connects to the existing
`JobCharchaDB` SQL Server database (Windows auth, see `appsettings.json`).

## Projects

- `JobPortal.Api` — controllers, JWT auth, Swagger, DI wiring (`Program.cs`).
- `JobPortal.Application` — DTOs, service interfaces, `AppRoles`/`RoleMapper`, `ServiceResult`.
- `JobPortal.Infrastructure` — EF Core `AppDbContext` (scaffolded from the live DB), service implementations.
- `JobPortal.Tests` — xUnit unit tests (EF Core InMemory provider, no real DB needed).

## Running

```
dotnet run --project JobPortal.Api --launch-profile http
```

API listens on `http://localhost:5101`. Swagger UI at `/swagger`.

## Database

`AppDbContext` was scaffolded (db-first) from the live `JobCharchaDB`, which already had
~90 tables, ASP.NET Identity tables, and its own `__EFMigrationsHistory`. Only one new
table was added in Phase 1: `SiteSettings` (singleton CMS settings row).

To re-scaffold after schema changes made outside this repo:

```
cd JobPortal.Infrastructure
dotnet ef dbcontext scaffold "<connection string>" Microsoft.EntityFrameworkCore.SqlServer -o Data/Entities -c AppDbContext --context-dir Data --no-onconfiguring --data-annotations --force
```

This overwrites `Data/AppDbContext.cs` and `Data/Entities/*.cs`. **After re-scaffolding,
delete the 11 `HangFire` schema entities again** (`AggregatedCounter`, `Counter`, `Hash`,
`Job1`, `JobParameter`, `JobQueue`, `List`, `Schema`, `Server`, `Set`, `State` — plus their
`DbSet<>` lines and `modelBuilder.Entity<>()` blocks in `AppDbContext.cs`). The `dotnet-ef`
scaffold command has no "exclude schema" flag, only an include-list (`-t`), so re-scaffolding
always regenerates these unless the Hangfire tables are dropped from the DB entirely — the
tables are real (Hangfire is present but unused, see A7 in the audit backlog) so we've left
them alone rather than drop them ourselves. `Job1` is `HangFire.Job`, scaffolded under a `1`
suffix only because the app's own `Job` entity already owns that name — it is **not** a
duplicate of the app's `Jobs` table. `SeekerProfiles` (superseded by `JobSeekerProfile`,
confirmed zero references and zero rows) was dropped outright and won't reappear.

The `SiteSettings`
DbSet lives in a separate partial file (`Data/AppDbContext.SiteSettings.cs`) that
survives re-scaffolding untouched.

### Adding new tables going forward

Because the DB already has its own migration history, a normal `dotnet ef
migrations add` generates `CreateTable` for **every** scaffolded entity, not just
the new one (EF has no record of the pre-existing tables). The `InitialBaseline`
migration was applied using this baseline technique — repeat it for future
schema additions:

1. Add/modify entities, run `dotnet ef migrations add <Name>`.
2. Run `dotnet ef migrations script` and pull out only the `CREATE TABLE`/`ALTER
   TABLE` statements for the genuinely new objects (ignore statements for tables
   that already exist).
3. Run that extracted SQL against the DB directly (`sqlcmd`/SSMS).
4. Manually `INSERT` the migration's id/product-version row into
   `__EFMigrationsHistory` so EF considers it applied.

## Auth

Custom JWT auth against the existing `AspNetUsers`/`AspNetRoles` tables (no
`UserManager`/`SignInManager` — `PasswordHasher<AspNetUser>` is used directly,
which is compatible with the password hashes already in the DB). Seeded roles:
`SuperAdmin`, `Admin`, `Employer`, `JobSeeker`, `User`. The frontend's role
strings (`aspirant`/`employer`/`admin`/...) are translated to/from these DB role
names by `RoleMapper` — the frontend never needs to know the DB names.

Only `aspirant` and `employer` can self-register (`RoleMapper.IsPubliclyRegisterable`).
Admin accounts must be provisioned directly in the DB.

**Known seed-data quirks** (pre-existing, not introduced by Phase 1):
- Every pre-existing seeded `AspNetUsers` row had `IsActive = 0` except the ones
  created through this API. `ajayrathwa942@gmail.com` (Admin + SuperAdmin roles)
  was activated and its password reset to `AdminPass123!` for testing — change
  this before shipping.
- `admin@jha.com` has a `NormalizedEmail` that doesn't match `UPPER(Email)` (a
  pre-existing data glitch), so it can't log in until that row is fixed directly
  in the DB.

## Testing

```
dotnet test JobPortal.Tests/JobPortal.Tests.csproj
```

Covers the three areas where a silent regression costs cash or trust: payment
verify + webhook signature checks (`PaymentServiceTests`), test-attempt
scoring/negative-marking and premium-analytics gating (`TestAttemptServiceTests`),
and employer credit-deduction concurrency (`EmployerContactServiceTests`). All
use a fresh `Guid`-named EF Core InMemory database per test — no SQL Server
connection required.

The concurrency test needs one extra piece: SQL Server auto-generates a new
`ROWVERSION` on every write, which is what lets `EmployerContactService`'s
retry loop detect a conflicting concurrent request — but the InMemory provider
doesn't replicate that automatically, so a stale-tracked context never sees a
value change and the conflict never fires. `TestSupport/ConcurrencyTestDbContext`
bumps `EmployerCredits.RowVersion` on every modified row inside `SaveChanges`
to stand in for that server behavior, purely for this one test.

## Third-party integrations

- `IFileStorageService` → `LocalFileStorageService` writes to
  `JobPortal.Api/wwwroot/uploads`, served at `/uploads/...`. Swap for a
  Cloudflare R2-backed implementation later — callers don't change.
- `IEmailSender` — wired to a real SMTP sender using the Hostinger
  credentials in user-secrets (`dotnet user-secrets list` from `JobPortal.Api`
  to confirm locally). Falls back to the earlier no-op/log-only behavior if
  those secrets are absent.
- Razorpay is wired up (`RazorpayClient`, live keys in user-secrets) for
  aspirant plan and test-purchase payments: order creation, client-signature
  verification, and webhook handling (`PaymentsController`). Admin-only refund
  and stuck-payment reconciliation live in `AdminPaymentsController`:
  - `POST /api/admin/payments/{id}/refund` — refunds a Paid payment through
    Razorpay and revokes the subscription/test-purchase it granted.
  - `GET /api/admin/payments/stuck` — lists Pending payments old enough that
    the client's `/verify` callback plausibly never arrived (browser closed
    mid-flow, network drop).
  - `POST /api/admin/payments/{id}/resync` — re-checks a stuck payment against
    Razorpay's own order-payments record and resolves it to Paid/Failed.

## Social auto-share (Telegram, Facebook, Instagram)

Publishing a Job, Result, Admit Card, Scheme or News item queues a share to Telegram, a Facebook Page and an
Instagram Business account. This covers every publish path: the web admin forms, AI Magic, Job AI / the mobile posting
pages, and the scraper queue. Publishing never waits on the social APIs. A background worker (`SocialShareWorker`)
posts from the `SocialShareJobs` table, which is also the Activity Log.

**How a share flows**

1. A post goes live. `SocialShareService.EnqueueAsync` writes one `SocialShareJobs` row per enabled channel. Editing,
   unpublishing and republishing never re-share, and a unique index stops duplicates.
2. If the category's **Ask me to approve first** is on (the default), the worker builds the image and caption and the share
   waits in *Admin → Auto-share → Activity log → Needs approval*. Approving (optionally after editing the caption) queues it.
3. The worker generates one image per post: a text-free AI background from OpenAI, with the title and key details drawn
   on top by the site using bundled Noto Sans and Noto Sans Gujarati fonts. If OpenAI is off, fails or the daily cap is
   reached, the branded gradient template is used. The image is saved under `/uploads/social/`, which must be publicly reachable.
4. Each channel posts independently. Failures retry with exponential backoff (60s, 2m, 4m, ...) up to `MaxAttempts`
   (default 4), then show as *Failed* with a **Retry** button. Telegram falls back to text-only without an image, and
   Facebook falls back to a link post. Instagram needs an image.
5. The Telegram `message_id`, Facebook post id and Instagram media id are stored on the row. A row that already has an id
   is never posted again.

Use **Skip social posting** on a publish form to opt a single post out, and **Share again** to re-post manually.

### Environment variables (server only)

Never put these in the frontend or in git. Locally use `dotnet user-secrets set NAME value` from `JobPortal.Api`. On the
server use `Environment=` lines in the systemd unit or `/etc/...` env file. `.env.example` lists the names with no values.

| Variable | Needed for |
| --- | --- |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | Telegram |
| `OPENAI_API_KEY` | AI backgrounds (optional; without it the gradient template is used) |
| `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID` | Facebook Page posts |
| `META_PAGE_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` | Instagram posts |
| `META_APP_ID`, `META_APP_SECRET` | Optional. Lets the admin page show the token's expiry date and any missing permissions |

A channel with missing variables is skipped (shown as *Skipped* with the reason) and never blocks a publish.

Optional settings (appsettings `SocialShare` section, or env vars such as `SocialShare__DailyImageCap=10`):

| Key | Default | Meaning |
| --- | --- | --- |
| `OpenAiImageModel` | `gpt-image-1` | Image model name. Change it here when OpenAI recommends a newer one |
| `DailyImageCap` | `20` | Maximum OpenAI image generations per UTC day (cost control) |
| `MaxAttempts` | `4` | Attempts per channel (maximum 5) |
| `BaseBackoffSeconds` | `60` | First retry delay; doubles each time, capped at 1 hour |
| `TokenWarnDays` | `14` | Warn in admin when the Meta token expires within this many days |
| `PublicBaseUrl` | `App:FrontendBaseUrl` | Origin used for post links and the image URLs Instagram downloads |
| `WorkerEnabled` | `true` | Set `false` to stop the worker (it also respects `BackgroundSweeps:Enabled`) |
| `MetaGraphVersion` | `v21.0` | Graph API version |

### Telegram bot

1. In Telegram open **@BotFather**, send `/newbot`, and copy the token into `TELEGRAM_BOT_TOKEN`.
2. Open your channel, then *Administrators → Add administrator*, and add the bot with **Post messages** permission.
3. Set `TELEGRAM_CHANNEL_ID` to `@your_channel_username` for a public channel. For a private channel use its numeric id
   (it looks like `-100123456789`).
4. In *Admin → Auto-share*, click **Telegram test**. A test message should appear in the channel.

### Meta (Facebook Page and Instagram)

1. The Instagram account must be a **Business or Creator** account **linked to your Facebook Page**.
2. In [developers.facebook.com](https://developers.facebook.com) create an app (type *Business*) and add the Facebook
   Login for Business or Pages API products.
3. Request these permissions: **`pages_manage_posts`**, **`pages_read_engagement`**, **`instagram_content_publish`**
   (plus `instagram_basic` and `pages_show_list`, which the token flow needs). In development mode they work for app
   admins and testers. Public use needs App Review.
4. Generate a **long-lived** token:
   1. In the Graph API Explorer, get a *User* token with the permissions above.
   2. Exchange it for a long-lived user token:
      `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-token}`
   3. With that token call `GET /me/accounts`. The `access_token` returned for your Page is a **non-expiring Page token**.
      Put it in `META_PAGE_ACCESS_TOKEN` and the Page's `id` in `META_PAGE_ID`.
   4. Find the Instagram id: `GET /{page-id}?fields=instagram_business_account`, then set `INSTAGRAM_ACCOUNT_ID`.
5. Set `META_APP_ID` and `META_APP_SECRET` if you want the admin page to show the real expiry date and warn about missing
   permissions. Without them it can only tell when the token has stopped working.
6. The site shows an amber warning in *Admin → Auto-share* when the token expires within `TokenWarnDays`, has expired, or was
   rejected by Meta, and a post that Meta rejects with an expired token flips the warning immediately.

Instagram downloads the image from your server, so `PublicBaseUrl` must be a real public `https://` origin. `localhost`
cannot be fetched, so test Instagram on a deployed server. The image is JPEG, 1080×1080 or 1080×1350 (set per category).

### Database

Apply migration `AddSocialShare` (adds `SocialShareSettings`, `SocialShareJobs`, `SocialImageUsages`):

```
dotnet ef database update --project JobPortal.Infrastructure --startup-project JobPortal.Api
```

For production, generate and review a script first: `dotnet ef migrations script --idempotent ...`.

### Tests

`SocialShareEnqueueTests` (queuing, skip, one-share-per-post idempotency), `TelegramShareTests` (template rendering and escaping),
`MetaShareTests` (Graph calls, captions, token warnings), `SocialImageTests` (composition, daily cap, fallbacks),
`SocialShareProcessorTests` (retry and backoff, idempotency, channel isolation, approval), `SocialShareSettingsTests`.
A manual end-to-end checklist is in [`AUTO_SHARE_TEST_CHECKLIST.md`](../AUTO_SHARE_TEST_CHECKLIST.md).
