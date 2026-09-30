using System.Text.Json;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

public class AuditServiceTests
{
    private static AuditService Create(out AppDbContext db, string dbName)
    {
        db = TestDb.Create(dbName);
        return new AuditService(db, new HttpContextAccessor());
    }

    [Fact]
    public async Task LogAsync_PersistsResolvedFields_AndSerializesMetadata()
    {
        var svc = Create(out var db, TestDb.NewDbName());

        await svc.LogAsync(new AuditEntry
        {
            EventType = "contact.submitted",
            Category = "Contact",
            Summary = "Contact form: \"Billing\" — from A B <a@b.com>",
            ActorEmail = "a@b.com",
            TargetType = "Contact",
            TargetId = "42",
            Metadata = new { subject = "Billing", phone = "999" },
        });

        var row = await db.AuditEvents.SingleAsync();
        Assert.Equal("contact.submitted", row.EventType);
        Assert.Equal("Contact", row.Category);
        Assert.Equal("a@b.com", row.ActorEmail);
        Assert.Equal("42", row.TargetId);
        Assert.NotEqual(default, row.CreatedDate);

        using var meta = JsonDocument.Parse(row.MetadataJson!);
        Assert.Equal("Billing", meta.RootElement.GetProperty("subject").GetString());
    }

    [Fact]
    public async Task LogAsync_TruncatesOverlongValues()
    {
        var svc = Create(out var db, TestDb.NewDbName());

        await svc.LogAsync(new AuditEntry
        {
            EventType = "employer.registered",
            Category = "Auth",
            Summary = new string('x', 500),
        });

        var row = await db.AuditEvents.SingleAsync();
        Assert.Equal(300, row.Summary.Length);
    }

    [Fact]
    public async Task QueryAsync_FiltersByCategory_AndEventType()
    {
        var svc = Create(out _, TestDb.NewDbName());
        await Seed(svc, "Auth", "aspirant.registered", "one");
        await Seed(svc, "Auth", "employer.registered", "two");
        await Seed(svc, "Billing", "subscription.purchased", "three");

        var auth = await svc.QueryAsync(new AuditQuery { Category = "Auth" });
        Assert.Equal(2, auth.TotalCount);

        var employers = await svc.QueryAsync(new AuditQuery { EventType = "employer.registered" });
        Assert.Single(employers.Items);
        Assert.Equal("two", employers.Items[0].Summary);
    }

    [Fact]
    public async Task QueryAsync_FiltersByDateRange()
    {
        var svc = Create(out var db, TestDb.NewDbName());
        await Seed(svc, "Auth", "aspirant.registered", "old");
        await Seed(svc, "Auth", "aspirant.registered", "new");

        var rows = await db.AuditEvents.OrderBy(e => e.Id).ToListAsync();
        rows[0].CreatedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        rows[1].CreatedDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        await db.SaveChangesAsync();

        var result = await svc.QueryAsync(new AuditQuery
        {
            From = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
            To = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
        });

        Assert.Single(result.Items);
        Assert.Equal("new", result.Items[0].Summary);
    }

    [Fact]
    public async Task QueryAsync_SearchMatchesSummaryEmailAndActorName()
    {
        var svc = Create(out var db, TestDb.NewDbName());
        db.AspNetUsers.Add(new AspNetUser
        {
            Id = "u1", FirstName = "Priya", LastName = "Sharma",
            Email = "priya@example.com", CreatedDate = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        await svc.LogAsync(new AuditEntry { EventType = "jobapplication.submitted", Category = "Employer", Summary = "applied to Clerk", ActorUserId = "u1", ActorEmail = "priya@example.com" });
        await svc.LogAsync(new AuditEntry { EventType = "contact.submitted", Category = "Contact", Summary = "asked about refunds", ActorEmail = "someone@else.com" });

        Assert.Single((await svc.QueryAsync(new AuditQuery { Search = "Clerk" })).Items);
        Assert.Single((await svc.QueryAsync(new AuditQuery { Search = "priya@example.com" })).Items);
        Assert.Single((await svc.QueryAsync(new AuditQuery { Search = "Priya" })).Items); // via the AspNetUsers join
        Assert.Equal(2, (await svc.QueryAsync(new AuditQuery { Search = "a" })).TotalCount);
    }

    [Fact]
    public async Task QueryAsync_PagesNewestFirst()
    {
        var svc = Create(out var db, TestDb.NewDbName());
        for (var i = 0; i < 5; i++)
            await Seed(svc, "Auth", "aspirant.registered", $"evt{i}");

        // deterministic ordering — space the timestamps out
        var rows = await db.AuditEvents.OrderBy(e => e.Id).ToListAsync();
        for (var i = 0; i < rows.Count; i++) rows[i].CreatedDate = new DateTime(2026, 1, 1, 0, 0, i, DateTimeKind.Utc);
        await db.SaveChangesAsync();

        var page1 = await svc.QueryAsync(new AuditQuery { Page = 1, PageSize = 2 });
        Assert.Equal(5, page1.TotalCount);
        Assert.Equal(3, page1.TotalPages);
        Assert.Equal(new[] { "evt4", "evt3" }, page1.Items.Select(i => i.Summary).ToArray());

        var page3 = await svc.QueryAsync(new AuditQuery { Page = 3, PageSize = 2 });
        Assert.Equal(new[] { "evt0" }, page3.Items.Select(i => i.Summary).ToArray());
    }

    private static Task Seed(AuditService svc, string category, string eventType, string summary) =>
        svc.LogAsync(new AuditEntry { EventType = eventType, Category = category, Summary = summary });
}
