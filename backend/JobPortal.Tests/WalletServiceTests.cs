using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

public class WalletServiceTests
{
    // Each user gets a zero-balance WalletCredit with RowVersion pre-seeded: EF Core's InMemory
    // test provider (unlike real SQL Server, which auto-generates [Timestamp] rowversion columns)
    // rejects a brand-new WalletCredit with a null RowVersion — a test-provider quirk only, not a
    // production bug (WalletService.cs's identical "create wallet on first credit" pattern was
    // verified live against real SQL Server during the 2026-08-24 QA pass).
    private static async Task<JobPortal.Infrastructure.Data.AppDbContext> SeedUsersAsync(string dbName, params string[] userIds)
    {
        var db = TestDb.Create(dbName);
        foreach (var id in userIds)
        {
            db.AspNetUsers.Add(new AspNetUser { Id = id, FirstName = "User", LastName = id, Email = $"{id}@example.com", CreatedDate = DateTime.UtcNow });
            db.WalletCredits.Add(new WalletCredit { Id = Guid.NewGuid(), UserId = id, BalanceInr = 0, UpdatedAt = DateTime.UtcNow, RowVersion = new byte[8] });
        }
        await db.SaveChangesAsync();
        return db;
    }

    [Fact]
    public async Task AdminAdjustAsync_Credit_WritesImmutableAuditLogWithAdminTargetReasonIpAndTimestamp()
    {
        var db = await SeedUsersAsync(TestDb.NewDbName(), "admin-1", "target-1");
        var service = new WalletService(db, paymentService: null!);

        var before = DateTime.UtcNow;
        var result = await service.AdminAdjustAsync("target-1", 100m, "Goodwill credit for delayed download.", "admin-1", "203.0.113.5");

        Assert.True(result.Succeeded);
        var log = await db.WalletAdjustmentAuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal("admin-1", log.AdminUserId);
        Assert.Equal("target-1", log.TargetUserId);
        Assert.Equal(100m, log.Amount);
        Assert.Equal("Goodwill credit for delayed download.", log.Reason);
        Assert.Equal("203.0.113.5", log.IpAddress);
        Assert.Equal(100m, log.BalanceAfter);
        Assert.True(log.CreatedDate >= before);
    }

    [Fact]
    public async Task AdminAdjustAsync_MissingReason_FailsAndWritesNoAuditLog()
    {
        var db = await SeedUsersAsync(TestDb.NewDbName(), "admin-1", "target-1");
        var service = new WalletService(db, paymentService: null!);

        var result = await service.AdminAdjustAsync("target-1", 100m, "   ", "admin-1", "203.0.113.5");

        Assert.False(result.Succeeded);
        Assert.False(await db.WalletAdjustmentAuditLogs.AnyAsync());
    }

    [Fact]
    public async Task AdminAdjustAsync_Debit_LogsNegativeAmountAndCorrectBalanceAfter()
    {
        var db = await SeedUsersAsync(TestDb.NewDbName(), "admin-1", "target-1");
        (await db.WalletCredits.FirstAsync(w => w.UserId == "target-1")).BalanceInr = 300m;
        await db.SaveChangesAsync();
        var service = new WalletService(db, paymentService: null!);

        var result = await service.AdminAdjustAsync("target-1", -120m, "Reversing duplicate top-up.", "admin-1", null);

        Assert.True(result.Succeeded);
        Assert.Equal(180m, result.Data);
        var log = await db.WalletAdjustmentAuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal(-120m, log.Amount);
        Assert.Equal(180m, log.BalanceAfter);
        Assert.Null(log.IpAddress);
    }

    [Fact]
    public async Task GetAdminAuditLogAsync_FiltersByTargetUserAndIncludesNames()
    {
        var db = await SeedUsersAsync(TestDb.NewDbName(), "admin-1", "target-1", "target-2");
        var service = new WalletService(db, paymentService: null!);
        await service.AdminAdjustAsync("target-1", 50m, "Reason A", "admin-1", "1.2.3.4");
        await service.AdminAdjustAsync("target-2", 25m, "Reason B", "admin-1", "1.2.3.4");

        var result = await service.GetAdminAuditLogAsync(adminUserId: null, targetUserId: "target-1");

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("target-1", result.Items[0].TargetUserId);
        Assert.Equal("Reason A", result.Items[0].Reason);
        Assert.NotNull(result.Items[0].TargetName);
        Assert.NotNull(result.Items[0].TargetEmail);
    }

    [Fact]
    public async Task GetAdminAuditLogAsync_NoFilter_ReturnsNewestFirst()
    {
        var db = await SeedUsersAsync(TestDb.NewDbName(), "admin-1", "target-1");
        var service = new WalletService(db, paymentService: null!);
        await service.AdminAdjustAsync("target-1", 10m, "First", "admin-1", null);
        await service.AdminAdjustAsync("target-1", 20m, "Second", "admin-1", null);

        var result = await service.GetAdminAuditLogAsync(null, null);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal("Second", result.Items[0].Reason);
        Assert.Equal("First", result.Items[1].Reason);
    }
}
