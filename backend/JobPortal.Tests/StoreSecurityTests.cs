using System.Security.Cryptography;
using System.Text;
using JobPortal.Application.DTOs.Store;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobPortal.Tests;

/// <summary>Pre-marketing audit regressions: paid files never leak through public APIs, and every way an order can become Paid
/// (verify, webhook, free) is exactly-once, server-priced and only ever unlocks the buyer's own downloads.</summary>
public class StoreSecurityTests
{
    private const string KeySecret = "store_test_key_secret";
    private const string PaidDriveLink = "https://drive.google.com/uc?export=download&id=PAID_FILE";

    private static StoreOrderService NewService(AppDbContext db) => new(db, new FakeRazorpayClient(),
        Options.Create(new JobPortal.Application.Common.RazorpaySettings { KeyId = "k", KeySecret = KeySecret, WebhookSecret = "w" }), new NoOpAuditService());

    private static string Sign(string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(KeySecret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private static async Task<AppDbContext> SeedAsync(bool withFreeProduct = false)
    {
        var db = TestDb.Create(TestDb.NewDbName());
        foreach (var id in new[] { "buyer", "other" })
            db.AspNetUsers.Add(new AspNetUser { Id = id, FirstName = id, LastName = "x", Email = $"{id}@example.com", CreatedDate = DateTime.UtcNow });
        db.Products.Add(new Product
        {
            ProductId = 1, Title = "Paid Book", Slug = "paid-book", Category = "GPSC", IsFree = false, Price = 299m, IsActive = true,
            GoogleDriveDownloadUrl = PaidDriveLink, GoogleDriveViewUrl = "https://drive.google.com/file/d/PAID_FILE/view", CreatedDate = DateTime.UtcNow,
        });
        if (withFreeProduct)
            db.Products.Add(new Product
            {
                ProductId = 2, Title = "Free Notes", Slug = "free-notes", Category = "GPSC", IsFree = true, Price = 0m, IsActive = true,
                GoogleDriveDownloadUrl = "https://drive.google.com/uc?id=FREE", CreatedDate = DateTime.UtcNow,
            });
        await db.SaveChangesAsync();
        return db;
    }

    private static async Task<Order> AddPendingOrderAsync(AppDbContext db, string rzpOrder = "order_1", decimal amount = 299m)
    {
        var order = new Order
        {
            OrderNumber = $"ORD-{rzpOrder}", UserId = "buyer", CustomerName = "buyer x", CustomerEmail = "buyer@example.com", CustomerPhone = "",
            Currency = "INR", TotalAmount = amount, FinalAmount = amount, PaymentStatus = "Pending", RazorpayOrderId = rzpOrder,
            OrderDate = DateTime.UtcNow, CreatedDate = DateTime.UtcNow,
        };
        order.OrderItems.Add(new OrderItem { ProductId = 1, ProductTitle = "Paid Book", ProductSlug = "paid-book", Price = amount, Quantity = 1, IsActive = true, MaxDownloadCount = 3, CreatedDate = DateTime.UtcNow });
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return order;
    }

    // ---- the critical leak ------------------------------------------------------------------------------

    [Fact]
    public async Task PublicProductApis_NeverExposeThePaidFileLinks_ButTheAdminListStillDoes()
    {
        var db = await SeedAsync();
        var products = new ProductService(db);

        var list = await products.SearchAsync(null, null, null);
        var detail = await products.GetBySlugAsync("paid-book");
        var admin = await products.GetAllForAdminAsync();

        Assert.All(list, p => { Assert.Null(p.GoogleDriveDownloadUrl); Assert.Null(p.GoogleDriveViewUrl); });
        Assert.Null(detail!.GoogleDriveDownloadUrl);
        Assert.Null(detail.GoogleDriveViewUrl);
        Assert.Equal(PaidDriveLink, admin.Single().GoogleDriveDownloadUrl);          // the admin form still needs it to edit
    }

    // ---- download authorisation -------------------------------------------------------------------------

    [Fact]
    public async Task Download_IsRefusedUnlessTheOrderIsPaidAndBelongsToTheCaller()
    {
        var db = await SeedAsync();
        var order = await AddPendingOrderAsync(db);
        var itemId = order.OrderItems.Single().OrderItemId;
        var service = NewService(db);

        Assert.Equal("NotPaid", (await service.GetDownloadUrlAsync("buyer", order.OrderId, itemId)).ErrorCode);       // unpaid
        await service.VerifyAsync("buyer", new VerifyStoreOrderRequest { RazorpayOrderId = "order_1", RazorpayPaymentId = "pay_1", RazorpaySignature = Sign("order_1|pay_1") });

        Assert.Equal("NotFound", (await service.GetDownloadUrlAsync("other", order.OrderId, itemId)).ErrorCode);       // another user's order
        Assert.Equal("NotFound", (await service.GetDownloadUrlAsync("buyer", order.OrderId, itemId + 999)).ErrorCode);  // someone else's/forged item id
        Assert.Equal("NotFound", (await service.GetDownloadUrlAsync("buyer", order.OrderId + 999, itemId)).ErrorCode);  // guessed order id
        Assert.Equal(PaidDriveLink, (await service.GetDownloadUrlAsync("buyer", order.OrderId, itemId)).Data);         // the buyer, after paying
    }

    [Fact]
    public async Task Download_StopsAtTheMaxDownloadCount()
    {
        var db = await SeedAsync();
        var order = await AddPendingOrderAsync(db);
        var itemId = order.OrderItems.Single().OrderItemId;
        var service = NewService(db);
        await service.VerifyAsync("buyer", new VerifyStoreOrderRequest { RazorpayOrderId = "order_1", RazorpayPaymentId = "pay_1", RazorpaySignature = Sign("order_1|pay_1") });

        for (var i = 0; i < 3; i++) Assert.True((await service.GetDownloadUrlAsync("buyer", order.OrderId, itemId)).Succeeded);
        Assert.Equal("DownloadLimitReached", (await service.GetDownloadUrlAsync("buyer", order.OrderId, itemId)).ErrorCode);
    }

    // ---- verify / webhook: exactly once, server-priced ----------------------------------------------------

    [Fact]
    public async Task Verify_WithAnotherUsersOrder_IsRejected()
    {
        var db = await SeedAsync();
        await AddPendingOrderAsync(db);

        var result = await NewService(db).VerifyAsync("other", new VerifyStoreOrderRequest { RazorpayOrderId = "order_1", RazorpayPaymentId = "pay_1", RazorpaySignature = Sign("order_1|pay_1") });

        Assert.Equal("NotFound", result.ErrorCode);
        Assert.Equal("Pending", (await db.Orders.AsNoTracking().SingleAsync()).PaymentStatus);
    }

    [Fact]
    public async Task Webhook_CapturedPayment_SettlesTheOrderOnce_EvenIfDeliveredTwice_AndCountsRevenueOnce()
    {
        var db = await SeedAsync();
        var order = await AddPendingOrderAsync(db);
        var service = NewService(db);

        Assert.True(await service.FulfillCapturedAsync("order_1", "pay_9", 29900, "INR"));
        Assert.True(await service.FulfillCapturedAsync("order_1", "pay_9", 29900, "INR"));      // Razorpay redelivery

        var saved = await db.Orders.AsNoTracking().Include(o => o.OrderItems).SingleAsync();
        Assert.Equal("Paid", saved.PaymentStatus);
        Assert.Equal("pay_9", saved.RazorpayPaymentId);
        Assert.False(string.IsNullOrEmpty(saved.OrderItems.Single().DownloadToken));
        var product = await db.Products.AsNoTracking().SingleAsync();
        Assert.Equal((1, 299m), (product.TotalSales, product.TotalRevenue));                   // counted once
        Assert.Equal(PaidDriveLink, (await service.GetDownloadUrlAsync("buyer", order.OrderId, saved.OrderItems.Single().OrderItemId)).Data);
    }

    [Fact]
    public async Task Webhook_WithAWrongAmountOrCurrency_NeverUnlocksTheOrder_AndIsLogged()
    {
        var db = await SeedAsync();
        await AddPendingOrderAsync(db);
        var service = NewService(db);

        await service.FulfillCapturedAsync("order_1", "pay_cheap", 100, "INR");                 // ₹1 paid for a ₹299 order
        await service.FulfillCapturedAsync("order_1", "pay_usd", 29900, "USD");

        Assert.Equal("Pending", (await db.Orders.AsNoTracking().SingleAsync()).PaymentStatus);
        Assert.Equal(2, await db.PaymentLogs.CountAsync(l => l.Event == "webhook.amount_mismatch"));
        Assert.Equal(0, (await db.Products.AsNoTracking().SingleAsync()).TotalSales);
    }

    [Fact]
    public async Task Webhook_ForAnUnknownRazorpayOrder_DoesNothing()
    {
        var db = await SeedAsync();
        await AddPendingOrderAsync(db);

        Assert.False(await NewService(db).FulfillCapturedAsync("order_nope", "pay_1", 29900, "INR"));
        Assert.Equal("Pending", (await db.Orders.AsNoTracking().SingleAsync()).PaymentStatus);
    }

    [Fact]
    public async Task BrowserClosedBeforeVerify_WebhookThenSettlesIt_AndALateVerifyDoesNotDoubleCount()
    {
        var db = await SeedAsync();
        await AddPendingOrderAsync(db);
        var service = NewService(db);

        await service.FulfillCapturedAsync("order_1", "pay_1", 29900, "INR");
        var late = await service.VerifyAsync("buyer", new VerifyStoreOrderRequest { RazorpayOrderId = "order_1", RazorpayPaymentId = "pay_1", RazorpaySignature = Sign("order_1|pay_1") });

        Assert.True(late.Succeeded);
        Assert.Equal(1, (await db.Products.AsNoTracking().SingleAsync()).TotalSales);
    }

    [Fact]
    public async Task ABadVerifySignature_DoesNotStopTheWebhookFromSettlingARealPayment()
    {
        var db = await SeedAsync();
        await AddPendingOrderAsync(db);
        var service = NewService(db);

        await service.VerifyAsync("buyer", new VerifyStoreOrderRequest { RazorpayOrderId = "order_1", RazorpayPaymentId = "pay_1", RazorpaySignature = "forged" });
        Assert.Equal("Pending", (await db.Orders.AsNoTracking().SingleAsync()).PaymentStatus);

        await service.FulfillCapturedAsync("order_1", "pay_1", 29900, "INR");
        Assert.Equal("Paid", (await db.Orders.AsNoTracking().SingleAsync()).PaymentStatus);
    }

    // ---- checkout pricing ---------------------------------------------------------------------------------

    [Fact]
    public async Task Checkout_PricesFromTheServer_ClampsQuantity_AndRejectsUnknownProducts()
    {
        var db = await SeedAsync();
        var service = NewService(db);

        var ok = await service.CheckoutAsync("buyer", new CheckoutRequest { PaymentMethod = "razorpay", Items = { new CartItemRequest { ProductId = 1, Quantity = 9999 } } });
        Assert.True(ok.Succeeded);
        Assert.Equal(299m * 10, ok.Data!.FinalAmount);                                          // quantity capped, price is the catalogue price

        var missing = await service.CheckoutAsync("buyer", new CheckoutRequest { PaymentMethod = "razorpay", Items = { new CartItemRequest { ProductId = 4242, Quantity = 1 } } });
        Assert.Equal("ProductUnavailable", missing.ErrorCode);
    }

    [Theory]
    [InlineData("razorpay")]
    [InlineData("wallet")]
    public async Task FreeCart_IsSettledDirectly_WithoutRazorpayOrAWalletRow(string method)
    {
        var db = await SeedAsync(withFreeProduct: true);
        var service = NewService(db);

        var result = await service.CheckoutAsync("buyer", new CheckoutRequest { PaymentMethod = method, Items = { new CartItemRequest { ProductId = 2, Quantity = 1 } } });

        Assert.True(result.Succeeded, result.Error);
        Assert.True(result.Data!.AlreadyPaid);
        var order = await db.Orders.AsNoTracking().Include(o => o.OrderItems).SingleAsync();
        Assert.Equal(("Paid", 0m, "free"), (order.PaymentStatus, order.FinalAmount, order.PaymentMethod));
        (await db.OrderItems.SingleAsync()).MaxDownloadCount = 3;      // SQL Server applies this column default; the in-memory test DB does not
        await db.SaveChangesAsync();
        Assert.Contains("FREE", (await service.GetDownloadUrlAsync("buyer", order.OrderId, order.OrderItems.Single().OrderItemId)).Data);
    }

    // ---- admin visibility ------------------------------------------------------------------------------------

    [Fact]
    public async Task AdminOrderList_SeparatesPaidFromPending_AndCountsOnlyPaidAsRevenue()
    {
        var db = await SeedAsync();
        await AddPendingOrderAsync(db, "order_paid", 299m);
        await AddPendingOrderAsync(db, "order_pending", 299m);
        var service = NewService(db);
        await service.FulfillCapturedAsync("order_paid", "pay_1", 29900, "INR");

        var all = await service.GetAdminOrdersAsync(null, 1, 25);
        Assert.Equal(2, all.Total);
        Assert.Equal(299m, all.PaidRevenue);                                   // the pending order is not revenue
        Assert.Equal(1, all.CountsByStatus["Paid"]);
        Assert.Equal(1, all.CountsByStatus["Pending"]);

        var paidOnly = await service.GetAdminOrdersAsync("Paid", 1, 25);
        Assert.Single(paidOnly.Items);
        Assert.Equal("pay_1", paidOnly.Items[0].RazorpayPaymentId);
    }
}
