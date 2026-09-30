using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Auth;
using JobPortal.Application.DTOs.Contact;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Tests;

/// <summary>Proves the audit hooks fire on the user-side actions the admin "Activity Audit" screen
/// is meant to surface. Uses the real <see cref="AuditService"/> against the same in-memory context
/// as the service under test, mirroring the scoped-per-request DI wiring.</summary>
public class AuditInstrumentationTests
{
    private static IConfiguration Config() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "unit-test-signing-key-at-least-32-characters-long",
            ["Jwt:Issuer"] = "test",
            ["Jwt:Audience"] = "test",
        }).Build();

    private static void SeedRoles(AppDbContext db)
    {
        foreach (var name in new[] { AppRoles.JobSeeker, AppRoles.Employer })
            db.AspNetRoles.Add(new AspNetRole { Id = Guid.NewGuid().ToString(), Name = name, NormalizedName = name.ToUpperInvariant() });
        db.SaveChanges();
    }

    [Fact]
    public async Task RegisterAsync_Aspirant_WritesAspirantRegisteredEvent()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        SeedRoles(db);
        var auth = new AuthService(db, Config(), new NullEmailSender(), new HttpContextAccessor(), new AuditService(db, new HttpContextAccessor()));

        var result = await auth.RegisterAsync(new RegisterRequest
        {
            FirstName = "Asha", LastName = "Rao", Email = "asha@example.com", Password = "Correct-horse-1", Role = "aspirant",
        });
        Assert.True(result.Succeeded);

        var row = await db.AuditEvents.SingleAsync();
        Assert.Equal(AuditEventTypes.AspirantRegistered, row.EventType);
        Assert.Equal(AuditEventTypes.Categories.Auth, row.Category);
        Assert.Equal("asha@example.com", row.ActorEmail);
        Assert.Contains("asha@example.com", row.Summary);
    }

    [Fact]
    public async Task RegisterAsync_PersistsSignupSourceAndCampaign_AndEchoesToAuditMetadata()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        SeedRoles(db);
        var auth = new AuthService(db, Config(), new NullEmailSender(), new HttpContextAccessor(), new AuditService(db, new HttpContextAccessor()));

        var result = await auth.RegisterAsync(new RegisterRequest
        {
            FirstName = "Insta", LastName = "Lead", Email = "lead@ig.example", Password = "Correct-horse-1",
            Role = "aspirant", Source = "instagram", Campaign = "ig-2026-10",
        });
        Assert.True(result.Succeeded);

        var user = await db.AspNetUsers.SingleAsync(u => u.Email == "lead@ig.example");
        Assert.Equal("instagram", user.SignupSource);
        Assert.Equal("ig-2026-10", user.SignupCampaign);

        var row = await db.AuditEvents.SingleAsync();
        Assert.Contains("instagram", row.MetadataJson);
        Assert.Contains("ig-2026-10", row.MetadataJson);
    }

    [Fact]
    public async Task GetSignupSourceBreakdown_GroupsNullAsOrganic_AndSplitsRoles()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        SeedRoles(db);
        var mkAuth = () => new AuthService(db, Config(), new NullEmailSender(), new HttpContextAccessor(), new AuditService(db, new HttpContextAccessor()));

        await mkAuth().RegisterAsync(new RegisterRequest { FirstName = "A", LastName = "One", Email = "a1@x.example", Password = "Correct-horse-1", Role = "aspirant", Source = "instagram" });
        await mkAuth().RegisterAsync(new RegisterRequest { FirstName = "A", LastName = "Two", Email = "a2@x.example", Password = "Correct-horse-1", Role = "aspirant", Source = "instagram" });
        await mkAuth().RegisterAsync(new RegisterRequest { FirstName = "E", LastName = "One", Email = "e1@x.example", Password = "Correct-horse-1", Role = "employer", CompanyName = "Co", AcknowledgedTerms = true, Source = "instagram" });
        await mkAuth().RegisterAsync(new RegisterRequest { FirstName = "O", LastName = "One", Email = "o1@x.example", Password = "Correct-horse-1", Role = "aspirant" }); // organic

        var svc = new AuditService(db, new HttpContextAccessor());
        var breakdown = await svc.GetSignupSourceBreakdownAsync(null, null);

        var ig = breakdown.Single(b => b.Source == "instagram");
        Assert.Equal(2, ig.Aspirants);
        Assert.Equal(1, ig.Employers);
        Assert.Equal(3, ig.Total);
        Assert.Equal(1, breakdown.Single(b => b.Source == "organic").Total);
    }

    [Fact]
    public async Task RegisterAsync_Employer_WritesEmployerRegisteredEvent()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        SeedRoles(db);
        var auth = new AuthService(db, Config(), new NullEmailSender(), new HttpContextAccessor(), new AuditService(db, new HttpContextAccessor()));

        var result = await auth.RegisterAsync(new RegisterRequest
        {
            FirstName = "Ravi", LastName = "Kumar", Email = "hr@acme.example", Password = "Correct-horse-1",
            Role = "employer", CompanyName = "Acme Corp", AcknowledgedTerms = true,
        });
        Assert.True(result.Succeeded);

        var row = await db.AuditEvents.SingleAsync(e => e.EventType == AuditEventTypes.EmployerRegistered);
        Assert.Equal(AuditEventTypes.Categories.Auth, row.Category);
        Assert.Contains("Acme Corp", row.Summary);
    }

    [Fact]
    public async Task ContactSubmit_WritesContactSubmittedEvent()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var contact = new ContactService(db, new AuditService(db, new HttpContextAccessor()));

        var result = await contact.SubmitAsync(new ContactSubmitRequest
        {
            Name = "Meena", Email = "meena@example.com", Subject = "Payment issue", Message = "Please help",
        }, "1.2.3.4", "unit-test-agent");
        Assert.True(result.Succeeded);

        var row = await db.AuditEvents.SingleAsync();
        Assert.Equal(AuditEventTypes.ContactSubmitted, row.EventType);
        Assert.Equal("meena@example.com", row.ActorEmail);
        Assert.Equal("Contact", row.TargetType);
    }
}
