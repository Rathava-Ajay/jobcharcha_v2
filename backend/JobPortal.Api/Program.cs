using System.Text;
using System.Threading.RateLimiting;
using JobPortal.Api;
using JobPortal.Infrastructure;
using JobPortal.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// WebApplication.CreateBuilder is supposed to add this automatically in Development via
// implicit entry-assembly detection, but that didn't actually pick up secrets set via
// `dotnet user-secrets` in this project (verified: an env-var override took effect where
// the equivalent user-secrets value silently didn't) — adding it explicitly to stop relying
// on that detection.
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>(optional: true);
}

// Add services to the container.

// CommandTimeout bounds how long a stuck/slow query can hold a Kestrel request thread — without
// it, a hung remote-SQL-Server call (network blip, lock wait) blocks indefinitely, which is what
// was producing the intermittent "API stuck, blank page" symptom in production. Deliberately NOT
// adding EnableRetryOnFailure here: PaymentService/StoreOrderService hold manual
// BeginTransactionAsync/CommitAsync blocks (real-money Razorpay flows), and EF Core's retrying
// execution strategy refuses to run alongside user-initiated transactions unless every one of
// those call sites is rewritten to run inside CreateExecutionStrategy().ExecuteAsync(...) — that's
// real surgery on already-verified live payment code and needs its own careful pass, not a
// same-session bolt-on.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"), sql => sql.CommandTimeout(30)));

builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddHostedService<QueuedHostedService>();

// The two recurring sweeps hit LIVE Razorpay (payment resync) and send REAL expiry/low-credit
// emails via SMTP. Set BackgroundSweeps:Enabled=false (e.g. in appsettings.Development.json or an
// env var) when running a local build against production data so QA doesn't trigger either.
if (builder.Configuration.GetValue("BackgroundSweeps:Enabled", true))
{
    builder.Services.AddHostedService<EmployerNotificationSweepService>();
    builder.Services.AddHostedService<PaymentReconciliationService>();
    builder.Services.AddHostedService<SocialShareWorker>();
}

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSection["Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1),
    };
});
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Blanket limiter for every endpoint — generous, just a backstop against runaway clients.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // Tight limiter for credential-sensitive auth endpoints (login/register/password reset) —
    // these had zero throttling, making them an open credential-stuffing / spam-signup target.
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // Public catalogue list/search endpoints run DB LIKE scans and are the obvious scraping target.
    // Well above what a person clicking around and paginating would ever hit, well below a scraper.
    options.AddPolicy("search", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 90,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

builder.Services.AddResponseCaching();

builder.Services.AddControllers(options =>
{
    // Touch the prerender flag file after any successful content mutation (no-op unless configured).
    options.Filters.Add<JobPortal.Api.Filters.ContentChangeRebuildFilter>();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "JobPortal API", Version = "v1" });
    var jwtScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {token}",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
    };
    options.AddSecurityDefinition("Bearer", jwtScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { { jwtScheme, Array.Empty<string>() } });
});

var app = builder.Build();

LogConfigurationWarnings(app);

// Behind Nginx (or any reverse proxy) the app only ever sees plain HTTP from localhost — without
// this, UseHttpsRedirection()/UseHsts() below see every request as "not HTTPS" and redirect-loop.
// Default trust (loopback-only, no KnownProxies configured) is correct as long as Nginx and Kestrel
// run on the same host, which is the deployed setup.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();

    // Swagger is developer tooling — it publishes the full API surface, route list, and
    // request/response schemas. It must never be served in Production.
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // No stack traces / internals leak to clients; the real exception still gets logged server-side.
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var feature = context.Features.Get<IExceptionHandlerPathFeature>();
            if (feature?.Error is not null)
            {
                app.Logger.LogError(feature.Error, "Unhandled exception on {Path}", feature.Path);
            }
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("""{"error":"An unexpected error occurred."}""");
        });
    });
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseStaticFiles();

app.UseCors("Frontend");

app.UseResponseCaching();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Emits WARN-level log lines for configuration that is missing, still a placeholder, or
// self-contradictory. Never throws — the app still starts — so a bad deploy is loud in the
// logs instead of failing silently (or, worse, "working" with an insecure default).
static void LogConfigurationWarnings(WebApplication app)
{
    var cfg = app.Configuration;
    var log = app.Logger;
    var isProd = app.Environment.IsProduction();

    var keySecret = cfg["Razorpay:KeySecret"];
    var webhookSecret = cfg["Razorpay:WebhookSecret"];

    if (string.IsNullOrWhiteSpace(keySecret))
    {
        if (isProd)
            log.LogCritical("CONFIG: Razorpay:KeySecret is not set in Production — EVERY payment will fail with 'Authentication failed' (401). " +
                            "Set Razorpay__KeyId and Razorpay__KeySecret (and the separate Razorpay__WebhookSecret) as environment variables on the host and restart.");
        else
            log.LogWarning("CONFIG: Razorpay:KeySecret is not set — payment order creation will fail.");
    }
    if (string.IsNullOrWhiteSpace(webhookSecret))
        log.LogWarning("CONFIG: Razorpay:WebhookSecret is not set — every Razorpay webhook delivery will be rejected.");
    else if (!string.IsNullOrWhiteSpace(keySecret) && string.Equals(keySecret, webhookSecret, StringComparison.Ordinal))
        log.LogWarning(
            "CONFIG: Razorpay:WebhookSecret is identical to Razorpay:KeySecret. These are DIFFERENT secrets — " +
            "the webhook secret comes from Razorpay Dashboard -> Settings -> Webhooks. Webhook signature " +
            "verification will reject all deliveries until this is fixed.");

    var jwtKey = cfg["Jwt:Key"];
    if (string.IsNullOrWhiteSpace(jwtKey))
        log.LogWarning("CONFIG: Jwt:Key is not set — set it via the Jwt__Key environment variable.");
    else if (jwtKey.Length < 32)
        log.LogWarning("CONFIG: Jwt:Key is shorter than 32 characters — HMAC-SHA256 signing keys must be at least 32 bytes.");
    else if (isProd && (jwtKey.Contains("dev", StringComparison.OrdinalIgnoreCase)
                        || jwtKey.Contains("change", StringComparison.OrdinalIgnoreCase)
                        || jwtKey.Contains("example", StringComparison.OrdinalIgnoreCase)
                        || jwtKey.Contains("replace", StringComparison.OrdinalIgnoreCase)))
        log.LogWarning("CONFIG: Jwt:Key looks like a placeholder/dev value and this is Production — access tokens can be forged. Set a fresh random key via Jwt__Key.");

    if (isProd)
    {
        var origins = cfg.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        if (origins.Length == 0 || origins.Any(o => o.Contains("localhost", StringComparison.OrdinalIgnoreCase)))
            log.LogWarning("CONFIG: Cors:AllowedOrigins is empty or still contains localhost in Production: [{Origins}]", string.Join(", ", origins));

        var frontendUrl = cfg["App:FrontendBaseUrl"];
        if (string.IsNullOrWhiteSpace(frontendUrl) || frontendUrl.Contains("localhost", StringComparison.OrdinalIgnoreCase))
            log.LogWarning("CONFIG: App:FrontendBaseUrl is empty or still localhost in Production ('{Url}') — this feeds sitemap.xml and every outbound email link.", frontendUrl);

        var conn = cfg.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(conn) && conn.Contains("Trusted_Connection", StringComparison.OrdinalIgnoreCase))
            log.LogWarning("CONFIG: ConnectionStrings:DefaultConnection uses Trusted_Connection (Windows auth) in Production — a Linux host needs SQL Server authentication.");
    }
}

/// <summary>Lets WebApplicationFactory&lt;Program&gt; reference this top-level-statement Program for integration tests.</summary>
public partial class Program { }
