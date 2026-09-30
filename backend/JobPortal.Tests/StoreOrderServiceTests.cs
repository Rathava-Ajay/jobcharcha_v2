using System.Security.Cryptography;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Store;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobPortal.Tests;

public class StoreOrderServiceTests
{
    private const string KeySecret = "store_test_key_secret";

    private static RazorpaySettings Settings() => new()
    {
        KeyId = "rzp_test_key",
        KeySecret = KeySecret,
        WebhookSecret = "unused_here",
    };

    private static string Sign(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private static async Task<(StoreOrderService Service, JobPortal.Infrastructure.Data.AppDbContext Db, Order Order, Product Product)>
        SeedPendingOrderAsync(string dbName)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", Email = "asha@example.com", CreatedDate = DateTime.UtcNow });
        var product = new Product
        {
            ProductId = 1, Title = "Reasoning Book", Slug = "reasoning-book", Category = "Reasoning",
            IsFree = false, Price = 49m, IsActive = true, TotalSales = 2, TotalRevenue = 98m, CreatedDate = DateTime.UtcNow,
        };
        db.Products.Add(product);
        var order = new Order
        {
            OrderId = 1, OrderNumber = "ORD-TEST-0001", UserId = "user-1", CustomerName = "Asha Patel",
            CustomerEmail = "asha@example.com", CustomerPhone = "", Currency = "INR",
            TotalAmount = 49m, FinalAmount = 49m, PaymentStatus = "Pending",
            RazorpayOrderId = "order_store_abc", OrderDate = DateTime.UtcNow, CreatedDate = DateTime.UtcNow,
        };
        order.OrderItems.Add(new OrderItem
        {
            OrderId = 1, ProductId = product.ProductId, ProductTitle = product.Title, ProductSlug = product.Slug,
            Price = 49m, Quantity = 1, IsActive = true, MaxDownloadCount = 3, CreatedDate = DateTime.UtcNow,
        });
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var service = new StoreOrderService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());
        return (service, db, order, product);
    }

    [Fact]
    public async Task VerifyAsync_ValidSignature_MarksPaidAndUpdatesProductCounters()
    {
        var (service, db, order, product) = await SeedPendingOrderAsync(TestDb.NewDbName());
        var signature = Sign(KeySecret, $"{order.RazorpayOrderId}|pay_store1");

        var result = await service.VerifyAsync("user-1", new VerifyStoreOrderRequest
        {
            RazorpayOrderId = order.RazorpayOrderId!,
            RazorpayPaymentId = "pay_store1",
            RazorpaySignature = signature,
        });

        Assert.True(result.Succeeded);
        Assert.True(result.Data!.Unlocked);

        var reloadedOrder = await db.Orders.AsNoTracking().FirstAsync(o => o.OrderId == order.OrderId);
        Assert.Equal("Paid", reloadedOrder.PaymentStatus);
        Assert.Equal("pay_store1", reloadedOrder.RazorpayPaymentId);

        var reloadedProduct = await db.Products.AsNoTracking().FirstAsync(p => p.ProductId == product.ProductId);
        Assert.Equal(3, reloadedProduct.TotalSales); // was 2, +1 from this order
        Assert.Equal(147m, reloadedProduct.TotalRevenue); // was 98, +49
    }

    [Fact]
    public async Task VerifyAsync_RetriedAfterSuccess_ReturnsSameResultWithoutDuplicatingCounters()
    {
        var (service, db, order, product) = await SeedPendingOrderAsync(TestDb.NewDbName());
        var request = new VerifyStoreOrderRequest
        {
            RazorpayOrderId = order.RazorpayOrderId!,
            RazorpayPaymentId = "pay_store1",
            RazorpaySignature = Sign(KeySecret, $"{order.RazorpayOrderId}|pay_store1"),
        };

        var first = await service.VerifyAsync("user-1", request);
        // Simulates the client retrying /verify after a timeout even though the first call
        // already succeeded — e.g. the webhook equivalent for store orders, or a flaky network.
        var second = await service.VerifyAsync("user-1", request);

        Assert.True(first.Succeeded);
        Assert.True(second.Succeeded);
        Assert.Equal(first.Data!.OrderId, second.Data!.OrderId);

        var reloadedProduct = await db.Products.AsNoTracking().FirstAsync(p => p.ProductId == product.ProductId);
        Assert.Equal(3, reloadedProduct.TotalSales); // still just +1, not +2
        Assert.Equal(147m, reloadedProduct.TotalRevenue);
    }

    [Fact]
    public async Task VerifyAsync_InvalidSignature_MarksFailedAndDoesNotUpdateCounters()
    {
        var (service, db, order, product) = await SeedPendingOrderAsync(TestDb.NewDbName());

        var result = await service.VerifyAsync("user-1", new VerifyStoreOrderRequest
        {
            RazorpayOrderId = order.RazorpayOrderId!,
            RazorpayPaymentId = "pay_store1",
            RazorpaySignature = "not-the-real-signature",
        });

        Assert.False(result.Succeeded);
        Assert.Equal("SignatureMismatch", result.ErrorCode);

        var reloadedOrder = await db.Orders.AsNoTracking().FirstAsync(o => o.OrderId == order.OrderId);
        Assert.Equal("Failed", reloadedOrder.PaymentStatus);

        var reloadedProduct = await db.Products.AsNoTracking().FirstAsync(p => p.ProductId == product.ProductId);
        Assert.Equal(2, reloadedProduct.TotalSales); // unchanged
    }

    [Fact]
    public async Task VerifyAsync_NoOrderForThatRazorpayOrderId_ReturnsNotFound()
    {
        var (service, _, _, _) = await SeedPendingOrderAsync(TestDb.NewDbName());

        var result = await service.VerifyAsync("user-1", new VerifyStoreOrderRequest
        {
            RazorpayOrderId = "order_does_not_exist",
            RazorpayPaymentId = "pay_x",
            RazorpaySignature = "irrelevant",
        });

        Assert.False(result.Succeeded);
        Assert.Equal("NotFound", result.ErrorCode);
    }

    private static async Task<(StoreOrderService Service, JobPortal.Infrastructure.Data.AppDbContext Db, Order Order, Product Product)>
        SeedPaidRazorpayOrderAsync(string dbName)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", Email = "asha@example.com", CreatedDate = DateTime.UtcNow });
        var product = new Product
        {
            ProductId = 1, Title = "Reasoning Book", Slug = "reasoning-book", Category = "Reasoning",
            IsFree = false, Price = 49m, IsActive = true, TotalSales = 3, TotalRevenue = 147m, CreatedDate = DateTime.UtcNow,
        };
        db.Products.Add(product);
        var order = new Order
        {
            OrderId = 1, OrderNumber = "ORD-TEST-0002", UserId = "user-1", CustomerName = "Asha Patel",
            CustomerEmail = "asha@example.com", CustomerPhone = "", Currency = "INR",
            TotalAmount = 49m, FinalAmount = 49m, PaymentStatus = "Paid", PaymentMethod = "razorpay",
            RazorpayOrderId = "order_store_paid1", RazorpayPaymentId = "pay_store_paid1",
            OrderDate = DateTime.UtcNow, CreatedDate = DateTime.UtcNow,
        };
        order.OrderItems.Add(new OrderItem
        {
            OrderId = 1, ProductId = product.ProductId, ProductTitle = product.Title, ProductSlug = product.Slug,
            Price = 49m, Quantity = 1, IsActive = true, MaxDownloadCount = 3, DownloadCount = 1, CreatedDate = DateTime.UtcNow,
        });
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var service = new StoreOrderService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());
        return (service, db, order, product);
    }

    [Fact]
    public async Task AdminRefundAsync_PaidRazorpayOrder_MarksRefundedAndNetsOutProductCounters()
    {
        var (service, db, order, product) = await SeedPaidRazorpayOrderAsync(TestDb.NewDbName());

        var result = await service.AdminRefundAsync(order.OrderId, "admin-1", "Customer requested refund.");

        Assert.True(result.Succeeded);
        Assert.Equal("Refunded", result.Data!.Status);

        var reloadedOrder = await db.Orders.AsNoTracking().FirstAsync(o => o.OrderId == order.OrderId);
        Assert.Equal("Refunded", reloadedOrder.PaymentStatus);

        var reloadedProduct = await db.Products.AsNoTracking().FirstAsync(p => p.ProductId == product.ProductId);
        Assert.Equal(2, reloadedProduct.TotalSales); // was 3, -1 for the refunded order
        Assert.Equal(98m, reloadedProduct.TotalRevenue); // was 147, -49
    }

    [Fact]
    public async Task AdminRefundAsync_RefundedOrder_DownloadAccessIsRevoked()
    {
        var (service, db, order, _) = await SeedPaidRazorpayOrderAsync(TestDb.NewDbName());
        await service.AdminRefundAsync(order.OrderId, "admin-1", null);

        var item = await db.OrderItems.AsNoTracking().FirstAsync(i => i.OrderId == order.OrderId);
        var result = await service.GetDownloadUrlAsync("user-1", order.OrderId, item.OrderItemId);

        Assert.False(result.Succeeded);
        Assert.Equal("NotPaid", result.ErrorCode);
    }

    [Fact]
    public async Task AdminRefundAsync_OrderNotPaid_ReturnsNotRefundable()
    {
        var (service, _, order, _) = await SeedPendingOrderAsync(TestDb.NewDbName());

        var result = await service.AdminRefundAsync(order.OrderId, "admin-1", null);

        Assert.False(result.Succeeded);
        Assert.Equal("NotRefundable", result.ErrorCode);
    }

    [Fact]
    public async Task AdminRefundAsync_WalletPaidOrder_ReturnsNotRefundable()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", CreatedDate = DateTime.UtcNow });
        var order = new Order
        {
            OrderId = 1, OrderNumber = "ORD-TEST-0003", UserId = "user-1", CustomerName = "Asha Patel",
            CustomerEmail = "asha@example.com", CustomerPhone = "", Currency = "INR",
            TotalAmount = 49m, FinalAmount = 49m, PaymentStatus = "Paid", PaymentMethod = "wallet",
            OrderDate = DateTime.UtcNow, CreatedDate = DateTime.UtcNow,
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        var service = new StoreOrderService(db, new FakeRazorpayClient(), Options.Create(Settings()), new NoOpAuditService());

        var result = await service.AdminRefundAsync(order.OrderId, "admin-1", null);

        Assert.False(result.Succeeded);
        Assert.Equal("NotRefundable", result.ErrorCode);
    }
}
