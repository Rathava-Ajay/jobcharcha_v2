using System.Security.Cryptography;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Payments;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobPortal.Tests;

public class PaymentServiceTests
{
    private const string KeySecret = "test_key_secret";
    private const string WebhookSecret = "test_webhook_secret";

    private static RazorpaySettings Settings() => new()
    {
        KeyId = "rzp_test_key",
        KeySecret = KeySecret,
        WebhookSecret = WebhookSecret,
    };

    private static string Sign(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private static async Task<(PaymentService Service, JobPortal.Infrastructure.Data.AppDbContext Db, AspirantPayment Payment)>
        SeedPendingPlanPaymentAsync(string dbName)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", CreatedDate = DateTime.UtcNow });
        var plan = new AspirantPlan { Id = 1, Name = "Pro", Price = 499m, DurationDays = 30, UnlocksAllTests = true, IsActive = true, CreatedDate = DateTime.UtcNow };
        db.AspirantPlans.Add(plan);
        var payment = new AspirantPayment
        {
            Id = 1,
            UserId = "user-1",
            PaymentFor = "Plan",
            PlanId = plan.Id,
            Amount = 499m,
            Currency = "INR",
            Status = "Pending",
            RazorpayOrderId = "order_abc123",
            CreatedAt = DateTime.UtcNow,
        };
        db.AspirantPayments.Add(payment);
        await db.SaveChangesAsync();

        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());
        return (service, db, payment);
    }

    private static async Task<(PaymentService Service, JobPortal.Infrastructure.Data.AppDbContext Db, AspirantPayment Payment, Test Test)>
        SeedPendingTestPaymentAsync(string dbName)
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
            Id = 2,
            UserId = "user-1",
            PaymentFor = "Test",
            TestId = test.Id,
            Amount = 99m,
            Currency = "INR",
            Status = "Pending",
            RazorpayOrderId = "order_test_xyz",
            CreatedAt = DateTime.UtcNow,
        };
        db.AspirantPayments.Add(payment);
        await db.SaveChangesAsync();

        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());
        return (service, db, payment, test);
    }

    [Fact]
    public async Task VerifyPaymentAsync_ValidSignature_MarksPaidAndCreatesSubscription()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var signature = Sign(KeySecret, $"{payment.RazorpayOrderId}|pay_realpaymentid");

        var result = await service.VerifyPaymentAsync("user-1", new VerifyPaymentRequest
        {
            RazorpayOrderId = payment.RazorpayOrderId!,
            RazorpayPaymentId = "pay_realpaymentid",
            RazorpaySignature = signature,
        });

        Assert.True(result.Succeeded);
        Assert.True(result.Data!.Unlocked);

        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Paid", reloaded.Status);
        Assert.NotNull(reloaded.PaidAt);

        var subscription = await db.Subscriptions.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == "user-1");
        Assert.NotNull(subscription);
        Assert.Equal("active", subscription!.Status);
    }

    [Fact]
    public async Task VerifyPaymentAsync_ValidSignature_TestPurchase_CreatesTestPurchase()
    {
        var (service, db, payment, test) = await SeedPendingTestPaymentAsync(TestDb.NewDbName());
        var signature = Sign(KeySecret, $"{payment.RazorpayOrderId}|pay_realpaymentid");

        var result = await service.VerifyPaymentAsync("user-1", new VerifyPaymentRequest
        {
            RazorpayOrderId = payment.RazorpayOrderId!,
            RazorpayPaymentId = "pay_realpaymentid",
            RazorpaySignature = signature,
        });

        Assert.True(result.Succeeded);
        Assert.Equal(test.Id, result.Data!.TestId);
        var purchase = await db.TestPurchases.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == "user-1" && p.TestId == test.Id);
        Assert.NotNull(purchase);
    }

    [Fact]
    public async Task VerifyPaymentAsync_AlreadyPurchasedTest_DoesNotDuplicatePurchase()
    {
        var (service, db, payment, test) = await SeedPendingTestPaymentAsync(TestDb.NewDbName());
        // Simulate the test having already been unlocked through an earlier, separate order.
        db.TestPurchases.Add(new TestPurchase { UserId = "user-1", TestId = test.Id, Price = 99m, PurchasedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var signature = Sign(KeySecret, $"{payment.RazorpayOrderId}|pay_dup");
        var result = await service.VerifyPaymentAsync("user-1", new VerifyPaymentRequest
        {
            RazorpayOrderId = payment.RazorpayOrderId!,
            RazorpayPaymentId = "pay_dup",
            RazorpaySignature = signature,
        });

        Assert.True(result.Succeeded);
        var count = await db.TestPurchases.CountAsync(p => p.UserId == "user-1" && p.TestId == test.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task VerifyPaymentAsync_InvalidSignature_MarksFailedAndDoesNotUnlock()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());

        var result = await service.VerifyPaymentAsync("user-1", new VerifyPaymentRequest
        {
            RazorpayOrderId = payment.RazorpayOrderId!,
            RazorpayPaymentId = "pay_realpaymentid",
            RazorpaySignature = "0000tamperedsignature0000",
        });

        Assert.False(result.Succeeded);
        Assert.Equal("SignatureMismatch", result.ErrorCode);

        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Failed", reloaded.Status);
        Assert.False(await db.Subscriptions.AnyAsync());
    }

    [Fact]
    public async Task VerifyPaymentAsync_RetriedAfterSuccess_ReturnsSameResultWithoutDuplicatingSubscription()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var request = new VerifyPaymentRequest
        {
            RazorpayOrderId = payment.RazorpayOrderId!,
            RazorpayPaymentId = "pay_realpaymentid",
            RazorpaySignature = Sign(KeySecret, $"{payment.RazorpayOrderId}|pay_realpaymentid"),
        };

        var first = await service.VerifyPaymentAsync("user-1", request);
        // Simulates the client retrying /verify after a timeout, or a race with the webhook's own
        // payment.captured fulfillment — both should land on the same result, not an error.
        var second = await service.VerifyPaymentAsync("user-1", request);

        Assert.True(first.Succeeded);
        Assert.True(second.Succeeded);
        Assert.Equal(1, await db.Subscriptions.CountAsync(s => s.UserId == "user-1"));
    }

    [Fact]
    public async Task VerifyPaymentAsync_NoPendingPaymentForOrder_ReturnsNotFound()
    {
        var (service, _, _) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());

        var result = await service.VerifyPaymentAsync("user-1", new VerifyPaymentRequest
        {
            RazorpayOrderId = "order_does_not_exist",
            RazorpayPaymentId = "pay_x",
            RazorpaySignature = "irrelevant",
        });

        Assert.False(result.Succeeded);
        Assert.Equal("NotFound", result.ErrorCode);
    }

    [Fact]
    public async Task HandleWebhookAsync_ValidSignature_PaymentFailedEvent_MarksPaymentFailed()
    {
        var (_, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());

        var body = "{\"event\":\"payment.failed\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_fail1\",\"order_id\":\"" + payment.RazorpayOrderId + "\"}}}}";
        var signature = Sign(WebhookSecret, body);

        var handled = await service.HandleWebhookAsync(body, signature);

        Assert.True(handled);
        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Failed", reloaded.Status);
    }

    [Fact]
    public async Task HandleWebhookAsync_ValidSignature_RefundEvent_MarksPaymentRefunded()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        payment.Status = "Paid";
        payment.RazorpayPaymentId = "pay_refundme";
        await db.SaveChangesAsync();

        var body = """{"event":"refund.created","payload":{"refund":{"entity":{"payment_id":"pay_refundme"}}}}""";
        var signature = Sign(WebhookSecret, body);

        var handled = await service.HandleWebhookAsync(body, signature);

        Assert.True(handled);
        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Refunded", reloaded.Status);
    }

    [Fact]
    public async Task HandleWebhookAsync_InvalidSignature_ReturnsFalseDoesNotModifyPaymentButLogsTheAttempt()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var body = "{\"event\":\"payment.failed\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_fail1\",\"order_id\":\"" + payment.RazorpayOrderId + "\"}}}}";

        var handled = await service.HandleWebhookAsync(body, "not-the-real-signature");

        Assert.False(handled);
        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Pending", reloaded.Status);

        // Every receipt is audited now, including rejected ones — this is exactly the signal that
        // would have surfaced the real Razorpay:WebhookSecret misconfiguration sooner.
        var log = await db.PaymentLogs.AsNoTracking().SingleAsync();
        Assert.Equal("webhook.signature_invalid", log.Event);
        Assert.False(log.IsSuccess);
    }

    [Fact]
    public async Task HandleWebhookAsync_MissingSignatureHeader_ReturnsFalseAndLogsReceipt()
    {
        var (service, db, _) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var handled = await service.HandleWebhookAsync("{\"event\":\"payment.failed\"}", null);

        Assert.False(handled);
        var log = await db.PaymentLogs.AsNoTracking().SingleAsync();
        Assert.Equal("webhook.signature_missing", log.Event);
        Assert.False(log.IsSuccess);
    }

    [Fact]
    public async Task HandleWebhookAsync_MalformedJson_ReturnsFalseAndLogsReceipt()
    {
        var (service, db, _) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var body = "{not valid json";
        var signature = Sign(WebhookSecret, body);

        var handled = await service.HandleWebhookAsync(body, signature);

        Assert.False(handled);
        var log = await db.PaymentLogs.AsNoTracking().SingleAsync();
        Assert.Equal("webhook.malformed_json", log.Event);
        Assert.False(log.IsSuccess);
    }

    [Fact]
    public async Task HandleWebhookAsync_PaymentCaptured_MarksPaidAndCreatesSubscription()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var body = """{"event":"payment.captured","created_at":1700000000,"payload":{"payment":{"entity":{"id":"pay_captured1","order_id":"""
            + $"\"{payment.RazorpayOrderId}\"" + """}}}}""";
        var signature = Sign(WebhookSecret, body);

        var handled = await service.HandleWebhookAsync(body, signature);

        Assert.True(handled);
        var reloaded = await db.AspirantPayments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);
        Assert.Equal("Paid", reloaded.Status);
        Assert.Equal("pay_captured1", reloaded.RazorpayPaymentId);
        Assert.True(await db.Subscriptions.AnyAsync(s => s.PaymentId == payment.Id && s.Status == "active"));

        var log = await db.PaymentLogs.AsNoTracking().SingleAsync();
        Assert.Equal("payment.captured", log.Event);
        Assert.Equal(payment.RazorpayOrderId, log.RazorpayOrderId);
        Assert.NotNull(log.RazorpayEventId);
    }

    [Fact]
    public async Task HandleWebhookAsync_OrderPaid_TestPurchase_CreatesTestPurchase()
    {
        var (service, db, payment, test) = await SeedPendingTestPaymentAsync(TestDb.NewDbName());
        var body = """{"event":"order.paid","payload":{"order":{"entity":{"id":"""
            + $"\"{payment.RazorpayOrderId}\"" + """}},"payment":{"entity":{"id":"pay_via_order"}}}}""";
        var signature = Sign(WebhookSecret, body);

        var handled = await service.HandleWebhookAsync(body, signature);

        Assert.True(handled);
        var purchase = await db.TestPurchases.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == "user-1" && p.TestId == test.Id);
        Assert.NotNull(purchase);
    }

    [Fact]
    public async Task HandleWebhookAsync_PaymentCapturedTwice_IsIdempotent()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        var body = """{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_dup1","order_id":"""
            + $"\"{payment.RazorpayOrderId}\"" + """}}}}""";
        var signature = Sign(WebhookSecret, body);

        var first = await service.HandleWebhookAsync(body, signature);
        var second = await service.HandleWebhookAsync(body, signature); // simulates Razorpay's at-least-once redelivery

        Assert.True(first);
        Assert.True(second);
        Assert.Equal(1, await db.Subscriptions.CountAsync(s => s.PaymentId == payment.Id));

        var logs = await db.PaymentLogs.AsNoTracking().OrderBy(l => l.LogId).ToListAsync();
        Assert.Equal(2, logs.Count);
        Assert.Equal("payment.captured", logs[0].Event);
        Assert.Equal("payment.captured.duplicate", logs[1].Event);
    }

    [Fact]
    public async Task HandleWebhookAsync_PaymentCaptured_WalletTopUp_CreditsWallet()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", CreatedDate = DateTime.UtcNow });
        // Pre-seeded with a RowVersion placeholder: EF Core's InMemory test provider (unlike real
        // SQL Server, which auto-generates [Timestamp] rowversion columns on insert) rejects a
        // brand-new WalletCredit with a null RowVersion — a test-provider quirk only, not a
        // production bug; WalletService.cs's identical "create wallet on first credit" pattern was
        // verified live against real SQL Server during the 2026-08-24 QA pass.
        db.WalletCredits.Add(new WalletCredit { Id = Guid.NewGuid(), UserId = "user-1", BalanceInr = 0, UpdatedAt = DateTime.UtcNow, RowVersion = new byte[8] });
        var payment = new AspirantPayment
        {
            Id = 1, UserId = "user-1", PaymentFor = "WalletTopUp", Amount = 200m, Currency = "INR",
            Status = "Pending", RazorpayOrderId = "order_topup1", CreatedAt = DateTime.UtcNow,
        };
        db.AspirantPayments.Add(payment);
        await db.SaveChangesAsync();
        var service = new PaymentService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());

        var body = """{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_topup1","order_id":"order_topup1"}}}}""";
        var signature = Sign(WebhookSecret, body);

        var handled = await service.HandleWebhookAsync(body, signature);

        Assert.True(handled);
        var wallet = await db.WalletCredits.AsNoTracking().FirstAsync(w => w.UserId == "user-1");
        Assert.Equal(200m, wallet.BalanceInr);
        Assert.True(await db.WalletTransactions.AnyAsync(t => t.UserId == "user-1" && t.Type == "top_up" && t.Amount == 200m));
    }

    [Fact]
    public async Task HandleWebhookAsync_PaymentDisputeCreated_CreatesDisputeLinkedToLocalPayment()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        payment.Status = "Paid";
        payment.RazorpayPaymentId = "pay_disputed1";
        await db.SaveChangesAsync();

        var body = """
        {"event":"payment.dispute.created","created_at":1700000000,"payload":{"dispute":{"entity":{
          "id":"disp_test1","payment_id":"pay_disputed1","amount":49900,"currency":"INR",
          "amount_deducted":0,"reason_code":"processed_invalid_expired_card",
          "respond_by":1700100000,"status":"open","phase":"chargeback"
        }}}}
        """;
        var signature = Sign(WebhookSecret, body);

        var handled = await service.HandleWebhookAsync(body, signature);

        Assert.True(handled);
        var dispute = await db.Disputes.AsNoTracking().SingleAsync();
        Assert.Equal("disp_test1", dispute.RazorpayDisputeId);
        Assert.Equal("pay_disputed1", dispute.RazorpayPaymentId);
        Assert.Equal(49900, dispute.Amount);
        Assert.Equal("open", dispute.Status);
        Assert.Equal("chargeback", dispute.Phase);
        Assert.Equal("payment.dispute.created", dispute.LastEventName);
        Assert.Equal(payment.Id, dispute.AspirantPaymentId);
    }

    [Fact]
    public async Task HandleWebhookAsync_PaymentDisputeWon_UpdatesExistingDisputeInPlace()
    {
        var (service, db, payment) = await SeedPendingPlanPaymentAsync(TestDb.NewDbName());
        payment.Status = "Paid";
        payment.RazorpayPaymentId = "pay_disputed1";
        await db.SaveChangesAsync();

        var createdBody = """{"event":"payment.dispute.created","payload":{"dispute":{"entity":{"id":"disp_test1","payment_id":"pay_disputed1","amount":49900,"currency":"INR","status":"open","phase":"chargeback"}}}}""";
        await service.HandleWebhookAsync(createdBody, Sign(WebhookSecret, createdBody));

        var wonBody = """{"event":"payment.dispute.won","payload":{"dispute":{"entity":{"id":"disp_test1","payment_id":"pay_disputed1","amount":49900,"currency":"INR","status":"won","phase":"chargeback"}}}}""";
        var handled = await service.HandleWebhookAsync(wonBody, Sign(WebhookSecret, wonBody));

        Assert.True(handled);
        // Same dispute row updated in place, not a second one — Razorpay resends the full entity
        // on every phase change, keyed by the same RazorpayDisputeId.
        var disputes = await db.Disputes.AsNoTracking().ToListAsync();
        Assert.Single(disputes);
        Assert.Equal("won", disputes[0].Status);
        Assert.Equal("payment.dispute.won", disputes[0].LastEventName);
    }

    [Fact]
    public async Task CheckRazorpayHealthAsync_ReportsAuthProbeAndMaskedConfig()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = new PaymentService(db, new FakeRazorpayClient { AuthOk = true }, Options.Create(Settings()), new NoOpAuditService());

        var health = await service.CheckRazorpayHealthAsync();

        Assert.True(health.Authenticated);
        Assert.Equal(200, health.ProbeStatusCode);
        Assert.True(health.KeyIdConfigured);
        Assert.True(health.KeySecretConfigured);
        Assert.DoesNotContain(KeySecret, health.KeyIdMasked ?? "");
        // Settings() deliberately uses distinct secrets — the "webhook == key" misconfig must not trip.
        Assert.False(health.WebhookSecretEqualsKeySecret);
    }

    [Fact]
    public async Task CheckRazorpayHealthAsync_SurfacesAuthFailure()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = new PaymentService(db, new FakeRazorpayClient { AuthOk = false }, Options.Create(Settings()), new NoOpAuditService());

        var health = await service.CheckRazorpayHealthAsync();

        Assert.False(health.Authenticated);
        Assert.Equal(401, health.ProbeStatusCode);
    }
}
