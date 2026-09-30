using JobPortal.Application.Common;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobPortal.Tests;

public class PaymentRefundReconciliationTests
{
    private static RazorpaySettings Settings() => new() { KeyId = "rzp_test_key", KeySecret = "secret", WebhookSecret = "whsecret" };

    private static async Task<(AppDbContext Db, AspirantPayment Payment, Test Test)> SeedPaidTestPaymentAsync(string dbName)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", CreatedDate = DateTime.UtcNow });
        var exam = new Exam { Id = 1, Name = "SSC CGL", Slug = "ssc-cgl", CreatedDate = DateTime.UtcNow, IsActive = true };
        db.Exams.Add(exam);
        var test = new Test
        {
            Id = 1, ExamId = exam.Id, Title = "Mock Test 1", Slug = "mock-test-1", Type = 1,
            DurationMinutes = 60, NegativeMarking = 0.25m, MarksPerQuestion = 1m, TotalQuestions = 10,
            TotalMarks = 10, IsFree = false, Price = 99m, Status = 1, CreatedDate = DateTime.UtcNow, IsActive = true,
        };
        db.Tests.Add(test);
        var payment = new AspirantPayment
        {
            Id = 1, UserId = "user-1", PaymentFor = "Test", TestId = test.Id, Amount = 99m, Currency = "INR",
            Status = "Paid", RazorpayOrderId = "order_paid1", RazorpayPaymentId = "pay_paid1",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10), PaidAt = DateTime.UtcNow.AddMinutes(-9),
        };
        db.AspirantPayments.Add(payment);
        db.TestPurchases.Add(new TestPurchase { UserId = "user-1", TestId = test.Id, Price = 99m, PurchasedAt = DateTime.UtcNow.AddMinutes(-9), PaymentId = payment.Id });
        await db.SaveChangesAsync();
        return (db, payment, test);
    }

    private static async Task<(AppDbContext Db, AspirantPayment Payment, AspirantPlan Plan)> SeedPendingPlanPaymentAsync(string dbName, DateTime createdAt)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", CreatedDate = DateTime.UtcNow });
        var plan = new AspirantPlan { Id = 1, Name = "Pro", Price = 499m, DurationDays = 30, UnlocksAllTests = true, IsActive = true, CreatedDate = DateTime.UtcNow };
        db.AspirantPlans.Add(plan);
        var payment = new AspirantPayment
        {
            Id = 1, UserId = "user-1", PaymentFor = "Plan", PlanId = plan.Id, Amount = 499m, Currency = "INR",
            Status = "Pending", RazorpayOrderId = "order_stuck1", CreatedAt = createdAt,
        };
        db.AspirantPayments.Add(payment);
        await db.SaveChangesAsync();
        return (db, payment, plan);
    }

    [Fact]
    public async Task AdminRefundAsync_PaidTestPurchase_MarksRefundedAndRevokesAccess()
    {
        var (db, payment, test) = await SeedPaidTestPaymentAsync(TestDb.NewDbName());
        var razorpay = new FakeRazorpayClient();
        var service = new PaymentService(db, razorpay, Options.Create(Settings()), new NoOpAuditService());

        var result = await service.AdminRefundAsync(payment.Id, "admin-1", "Customer requested refund.");

        Assert.True(result.Succeeded);
        Assert.True(result.Data!.AccessRevoked);

        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Refunded", reloaded.Status);
        Assert.False(await db.TestPurchases.AnyAsync(p => p.UserId == "user-1" && p.TestId == test.Id));
    }

    [Fact]
    public async Task AdminRefundAsync_PaidPlanSubscription_MarksSubscriptionRefunded()
    {
        var dbName = TestDb.NewDbName();
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "A", LastName = "P", CreatedDate = DateTime.UtcNow });
        var plan = new AspirantPlan { Id = 1, Name = "Pro", Price = 499m, DurationDays = 30, UnlocksAllTests = true, IsActive = true, CreatedDate = DateTime.UtcNow };
        db.AspirantPlans.Add(plan);
        var payment = new AspirantPayment
        {
            Id = 1, UserId = "user-1", PaymentFor = "Plan", PlanId = plan.Id, Amount = 499m, Currency = "INR",
            Status = "Paid", RazorpayOrderId = "order_p1", RazorpayPaymentId = "pay_p1", CreatedAt = DateTime.UtcNow, PaidAt = DateTime.UtcNow,
        };
        db.AspirantPayments.Add(payment);
        db.Subscriptions.Add(new Subscription
        {
            UserId = "user-1", PlanId = plan.Id, Price = 499m, StartsAt = DateTime.UtcNow, ExpiresAt = DateTime.UtcNow.AddDays(30),
            Status = "active", PaymentId = payment.Id, CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());
        var result = await service.AdminRefundAsync(payment.Id, "admin-1", null);

        Assert.True(result.Succeeded);
        var subscription = await db.Subscriptions.AsNoTracking().FirstAsync(s => s.PaymentId == payment.Id);
        Assert.Equal("refunded", subscription.Status);
    }

    [Fact]
    public async Task AdminRefundAsync_PaymentNotPaid_ReturnsNotRefundable()
    {
        var (db, _, _) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName(), DateTime.UtcNow);
        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());

        var result = await service.AdminRefundAsync(1, "admin-1", null);

        Assert.False(result.Succeeded);
        Assert.Equal("NotRefundable", result.ErrorCode);
    }

    [Fact]
    public async Task AdminRefundAsync_RazorpayOutage_LeavesPaymentPaidAndLogsFailure()
    {
        var (db, payment, _) = await SeedPaidTestPaymentAsync(TestDb.NewDbName());
        var razorpay = new FakeRazorpayClient { ThrowOnRefund = true };
        var service = new PaymentService(db, razorpay, Options.Create(Settings()), new NoOpAuditService());

        var result = await service.AdminRefundAsync(payment.Id, "admin-1", null);

        Assert.False(result.Succeeded);
        Assert.Equal("RazorpayError", result.ErrorCode);
        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Paid", reloaded.Status); // untouched — refund never actually happened
        Assert.True(await db.PaymentLogs.AnyAsync(l => l.Event == "refund.request_failed"));
    }

    [Fact]
    public async Task GetStuckPendingPaymentsAsync_OnlyReturnsPendingOlderThanThreshold()
    {
        var dbName = TestDb.NewDbName();
        var (db, oldPayment, _) = await SeedPendingPlanPaymentAsync(dbName, DateTime.UtcNow.AddMinutes(-45));

        // A second, recent pending payment for the same user/plan shouldn't show up yet.
        db.AspirantPayments.Add(new AspirantPayment
        {
            Id = 2, UserId = "user-1", PaymentFor = "Plan", PlanId = 1, Amount = 499m, Currency = "INR",
            Status = "Pending", RazorpayOrderId = "order_fresh1", CreatedAt = DateTime.UtcNow.AddMinutes(-2),
        });
        await db.SaveChangesAsync();

        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());
        var stuck = await service.GetStuckPendingPaymentsAsync(olderThanMinutes: 30);

        var stuckIds = stuck.Select(s => s.PaymentId).ToList();
        Assert.Contains(oldPayment.Id, stuckIds);
        Assert.DoesNotContain(2, stuckIds);
    }

    [Fact]
    public async Task ResyncPaymentAsync_RazorpayShowsCaptured_MarksPaidAndGrantsSubscription()
    {
        var (db, payment, plan) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName(), DateTime.UtcNow.AddMinutes(-45));
        var razorpay = new FakeRazorpayClient
        {
            OrderPayments = { new() { Id = "pay_recovered1", OrderId = payment.RazorpayOrderId!, Status = "captured", Amount = 49900 } },
        };
        var service = new PaymentService(db, razorpay, Options.Create(Settings()), new NoOpAuditService());

        var result = await service.ResyncPaymentAsync(payment.Id);

        Assert.True(result.Succeeded);
        Assert.Equal("Paid", result.Data!.ResolvedStatus);
        Assert.Equal("pay_recovered1", result.Data.RazorpayPaymentId);

        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Paid", reloaded.Status);
        Assert.True(await db.Subscriptions.AnyAsync(s => s.PaymentId == payment.Id && s.Status == "active"));
    }

    [Fact]
    public async Task ResyncPaymentAsync_RazorpayShowsFailed_MarksFailedWithoutGrantingAccess()
    {
        var (db, payment, _) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName(), DateTime.UtcNow.AddMinutes(-45));
        var razorpay = new FakeRazorpayClient
        {
            OrderPayments = { new() { Id = "pay_failed1", OrderId = payment.RazorpayOrderId!, Status = "failed", Amount = 49900 } },
        };
        var service = new PaymentService(db, razorpay, Options.Create(Settings()), new NoOpAuditService());

        var result = await service.ResyncPaymentAsync(payment.Id);

        Assert.True(result.Succeeded);
        Assert.Equal("Failed", result.Data!.ResolvedStatus);
        Assert.False(await db.Subscriptions.AnyAsync(s => s.PaymentId == payment.Id));
    }

    [Fact]
    public async Task ResyncPaymentAsync_NoRazorpayRecordAtAll_StaysPending()
    {
        var (db, payment, _) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName(), DateTime.UtcNow.AddMinutes(-45));
        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService()); // no OrderPayments seeded

        var result = await service.ResyncPaymentAsync(payment.Id);

        Assert.True(result.Succeeded);
        Assert.Equal("StillPending", result.Data!.ResolvedStatus);
        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Pending", reloaded.Status);
    }

    private static async Task<(AppDbContext Db, AspirantPayment Payment)> SeedPaidWalletTopUpAsync(string dbName, decimal walletBalance)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", CreatedDate = DateTime.UtcNow });
        var payment = new AspirantPayment
        {
            Id = 1, UserId = "user-1", PaymentFor = "WalletTopUp", Amount = 200m, Currency = "INR",
            Status = "Paid", RazorpayOrderId = "order_wtu1", RazorpayPaymentId = "pay_wtu1",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10), PaidAt = DateTime.UtcNow.AddMinutes(-9),
        };
        db.AspirantPayments.Add(payment);
        // RowVersion pre-seeded: EF Core's InMemory test provider (unlike real SQL Server, which
        // auto-generates [Timestamp] rowversion columns) rejects a brand-new WalletCredit with a
        // null RowVersion — a test-provider quirk only, not a production bug.
        db.WalletCredits.Add(new WalletCredit { Id = Guid.NewGuid(), UserId = "user-1", BalanceInr = walletBalance, UpdatedAt = DateTime.UtcNow, RowVersion = new byte[8] });
        await db.SaveChangesAsync();
        return (db, payment);
    }

    [Fact]
    public async Task AdminRefundAsync_WalletTopUp_FullBalanceStillThere_ReversesFullAmount()
    {
        // ₹200 was granted and never spent — the full amount should be clawed back.
        var (db, payment) = await SeedPaidWalletTopUpAsync(TestDb.NewDbName(), walletBalance: 200m);
        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());

        var result = await service.AdminRefundAsync(payment.Id, "admin-1", "Customer requested refund.");

        Assert.True(result.Succeeded);
        Assert.True(result.Data!.AccessRevoked);

        var wallet = await db.WalletCredits.AsNoTracking().FirstAsync(w => w.UserId == "user-1");
        Assert.Equal(0m, wallet.BalanceInr);
        var reversal = await db.WalletTransactions.AsNoTracking().SingleAsync(t => t.Type == "refund_reversal");
        Assert.Equal(-200m, reversal.Amount);
    }

    [Fact]
    public async Task AdminRefundAsync_WalletTopUp_PartiallySpent_ClawsBackOnlyWhatsLeftAndNeverGoesNegative()
    {
        // ₹200 was granted, user already spent ₹150 of it — only ₹50 is left to claw back.
        var (db, payment) = await SeedPaidWalletTopUpAsync(TestDb.NewDbName(), walletBalance: 50m);
        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());

        var result = await service.AdminRefundAsync(payment.Id, "admin-1", "Customer requested refund.");

        Assert.True(result.Succeeded);
        Assert.False(result.Data!.AccessRevoked); // only partially recovered

        var wallet = await db.WalletCredits.AsNoTracking().FirstAsync(w => w.UserId == "user-1");
        Assert.Equal(0m, wallet.BalanceInr); // floored at 0, never negative
        var reversal = await db.WalletTransactions.AsNoTracking().SingleAsync(t => t.Type == "refund_reversal");
        Assert.Equal(-50m, reversal.Amount);

        var log = await db.PaymentLogs.AsNoTracking().SingleAsync(l => l.Event == "refund.manual");
        Assert.Contains("Only", log.EventData);
    }

    [Fact]
    public async Task AdminRefundAsync_WalletTopUp_AlreadyFullySpent_ClawsBackNothingButStillRefundsPayment()
    {
        var (db, payment) = await SeedPaidWalletTopUpAsync(TestDb.NewDbName(), walletBalance: 0m);
        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());

        var result = await service.AdminRefundAsync(payment.Id, "admin-1", null);

        Assert.True(result.Succeeded);
        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Refunded", reloaded.Status); // payment itself still marked refunded
        Assert.False(await db.WalletTransactions.AnyAsync(t => t.Type == "refund_reversal")); // nothing to reverse
        var wallet = await db.WalletCredits.AsNoTracking().FirstAsync(w => w.UserId == "user-1");
        Assert.Equal(0m, wallet.BalanceInr);
    }
}
