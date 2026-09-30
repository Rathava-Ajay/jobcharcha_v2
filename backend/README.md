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
