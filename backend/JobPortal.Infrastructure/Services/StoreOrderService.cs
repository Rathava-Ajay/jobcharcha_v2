using System.Security.Cryptography;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Store;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobPortal.Infrastructure.Services;

public class StoreOrderService : IStoreOrderService
{
    private readonly AppDbContext _db;
    private readonly IRazorpayClient _razorpay;
    private readonly RazorpaySettings _settings;
    private readonly IAuditService _audit;

    public StoreOrderService(AppDbContext db, IRazorpayClient razorpay, IOptions<RazorpaySettings> options, IAuditService audit)
    {
        _db = db;
        _razorpay = razorpay;
        _settings = options.Value;
        _audit = audit;
    }

    private Task LogOrderPaidAuditAsync(Order order, string method) =>
        _audit.LogAsync(new AuditEntry
        {
            EventType = AuditEventTypes.StoreOrderPaid,
            Category = AuditEventTypes.Categories.Store,
            Summary = $"Store order {order.OrderNumber} paid (₹{order.FinalAmount:0.##}, {method}) by {order.CustomerEmail}",
            ActorUserId = order.UserId,
            ActorEmail = order.CustomerEmail,
            TargetType = "Order",
            TargetId = order.OrderId.ToString(),
            Metadata = new { orderNumber = order.OrderNumber, total = order.FinalAmount, method },
        });

    public async Task<ServiceResult<CheckoutResponse>> CheckoutAsync(string userId, CheckoutRequest request)
    {
        if (request.Items.Count == 0)
            return ServiceResult<CheckoutResponse>.Fail("EmptyCart", "Your cart is empty.");

        var isWallet = string.Equals(request.PaymentMethod, "wallet", StringComparison.OrdinalIgnoreCase);
        if (!isWallet && !string.Equals(request.PaymentMethod, "razorpay", StringComparison.OrdinalIgnoreCase))
            return ServiceResult<CheckoutResponse>.Fail("BadRequest", "paymentMethod must be 'razorpay' or 'wallet'.");

        var user = await _db.AspNetUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return ServiceResult<CheckoutResponse>.Fail("NotFound", "User not found.");
        var customerName = $"{user.FirstName} {user.LastName}".Trim();
        var customerEmail = user.Email ?? "";
        var customerPhone = user.PhoneNumber;

        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _db.Products.Where(p => productIds.Contains(p.ProductId) && p.IsActive).ToListAsync();
        if (products.Count != productIds.Count)
            return ServiceResult<CheckoutResponse>.Fail("ProductUnavailable", "One or more items in your cart are no longer available.");

        var order = new Order
        {
            OrderNumber = await GenerateUniqueOrderNumberAsync(),
            UserId = userId,
            CustomerName = customerName,
            CustomerEmail = customerEmail,
            CustomerPhone = customerPhone ?? "",
            Currency = "INR",
            PaymentStatus = "Pending",
            OrderDate = DateTime.UtcNow,
            CreatedDate = DateTime.UtcNow,
        };

        decimal subtotal = 0;
        foreach (var item in request.Items)
        {
            var product = products.First(p => p.ProductId == item.ProductId);
            var quantity = Math.Max(1, item.Quantity);
            var unitPrice = product.IsFree ? 0 : (product.Price ?? 0);
            subtotal += unitPrice * quantity;

            order.OrderItems.Add(new OrderItem
            {
                ProductId = product.ProductId,
                ProductTitle = product.Title,
                ProductSlug = product.Slug,
                Price = unitPrice,
                Quantity = quantity,
                DownloadCount = 0,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
            });
        }

        order.TotalAmount = subtotal;
        order.DiscountAmount = 0;
        order.FinalAmount = subtotal;

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        if (isWallet)
            return await DebitWalletForOrderAsync(userId, order.OrderId);

        var amountPaise = (long)Math.Round(order.FinalAmount * 100, MidpointRounding.AwayFromZero);
        RazorpayOrderResult rpOrder;
        try
        {
            rpOrder = await _razorpay.CreateOrderAsync(amountPaise, "INR", $"store_{order.OrderId}");
        }
        catch (Exception ex)
        {
            order.PaymentStatus = "Failed";
            await _db.SaveChangesAsync();
            _db.PaymentLogs.Add(new PaymentLog
            {
                OrderId = order.OrderId,
                Event = "order.create_failed",
                Status = "Failed",
                Amount = amountPaise,
                Currency = "INR",
                IsSuccess = false,
                ErrorMessage = ex.Message,
                CreatedDate = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return ServiceResult<CheckoutResponse>.Fail("RazorpayError", "Could not create payment order. Please try again shortly.");
        }

        order.RazorpayOrderId = rpOrder.Id;
        _db.PaymentLogs.Add(new PaymentLog
        {
            OrderId = order.OrderId,
            RazorpayOrderId = rpOrder.Id,
            Event = "order.created",
            Status = "Pending",
            Amount = amountPaise,
            Currency = "INR",
            IsSuccess = true,
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        return ServiceResult<CheckoutResponse>.Ok(new CheckoutResponse
        {
            OrderId = order.OrderId,
            OrderNumber = order.OrderNumber,
            FinalAmount = order.FinalAmount,
            RazorpayOrderId = rpOrder.Id,
            RazorpayAmount = amountPaise,
            KeyId = _settings.KeyId,
            AlreadyPaid = false,
        });
    }

    public async Task<ServiceResult<VerifyStoreOrderResponse>> VerifyAsync(string userId, VerifyStoreOrderRequest request)
    {
        var order = await _db.Orders.Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.UserId == userId && o.RazorpayOrderId == request.RazorpayOrderId);
        if (order is null) return ServiceResult<VerifyStoreOrderResponse>.Fail("NotFound", "No order found for this payment.");

        // Idempotency: a retried /verify call (client timeout, or a race with the webhook) for a
        // payment that's already been applied returns the same result instead of re-applying the
        // debit/counters or erroring — order-status transitions only ever happen from Pending below.
        if (order.PaymentStatus == "Paid" && order.RazorpayPaymentId == request.RazorpayPaymentId)
            return ServiceResult<VerifyStoreOrderResponse>.Ok(new VerifyStoreOrderResponse { Unlocked = true, OrderId = order.OrderId });
        if (order.PaymentStatus != "Pending")
            return ServiceResult<VerifyStoreOrderResponse>.Fail("NotPending", $"This order is already {order.PaymentStatus}.");

        var expectedSignature = ComputeHmacSha256Hex(_settings.KeySecret, $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}");
        var isValid = FixedTimeEquals(expectedSignature, request.RazorpaySignature);

        if (!isValid)
        {
            order.PaymentStatus = "Failed";
            await _db.SaveChangesAsync();
            _db.PaymentLogs.Add(new PaymentLog
            {
                OrderId = order.OrderId,
                RazorpayOrderId = request.RazorpayOrderId,
                RazorpayPaymentId = request.RazorpayPaymentId,
                Event = "payment.verify_failed",
                Status = "Failed",
                IsSuccess = false,
                ErrorMessage = "Signature mismatch.",
                CreatedDate = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return ServiceResult<VerifyStoreOrderResponse>.Fail("SignatureMismatch", "Payment verification failed.");
        }

        // debit/credit (none here — Razorpay already collected the money) + order-status + product
        // counters, in one DB transaction. IsUniqueConstraintViolation catches the residual true-
        // concurrent race (this /verify call and the webhook's payment.captured handler committing
        // within the same instant): whichever writer loses re-reads and returns the winner's result
        // instead of surfacing an error.
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            order.PaymentStatus = "Paid";
            order.PaymentDate = DateTime.UtcNow;
            order.PaymentMethod = "razorpay";
            order.RazorpayPaymentId = request.RazorpayPaymentId;
            order.RazorpaySignature = request.RazorpaySignature;

            var productIds = order.OrderItems.Select(i => i.ProductId).Distinct().ToList();
            var products = await _db.Products.Where(p => productIds.Contains(p.ProductId)).ToListAsync();
            foreach (var item in order.OrderItems)
            {
                item.DownloadToken = Guid.NewGuid().ToString("N");
                var product = products.FirstOrDefault(p => p.ProductId == item.ProductId);
                if (product is not null)
                {
                    product.TotalSales += item.Quantity;
                    product.TotalRevenue += item.Price * item.Quantity;
                }
            }

            _db.PaymentLogs.Add(new PaymentLog
            {
                OrderId = order.OrderId,
                RazorpayOrderId = request.RazorpayOrderId,
                RazorpayPaymentId = request.RazorpayPaymentId,
                Event = "payment.verified",
                Status = "Paid",
                IsSuccess = true,
                CreatedDate = DateTime.UtcNow,
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            await transaction.RollbackAsync();
            var winner = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.RazorpayPaymentId == request.RazorpayPaymentId);
            if (winner is not null)
                return ServiceResult<VerifyStoreOrderResponse>.Ok(new VerifyStoreOrderResponse { Unlocked = true, OrderId = winner.OrderId });
            throw;
        }

        await LogOrderPaidAuditAsync(order, "razorpay");

        return ServiceResult<VerifyStoreOrderResponse>.Ok(new VerifyStoreOrderResponse { Unlocked = true, OrderId = order.OrderId });
    }

    public async Task<List<StoreOrderDto>> GetMyOrdersAsync(string userId)
    {
        var orders = await _db.Orders.AsNoTracking().Include(o => o.OrderItems)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        return orders.Select(o => new StoreOrderDto
        {
            OrderId = o.OrderId,
            OrderNumber = o.OrderNumber,
            FinalAmount = o.FinalAmount,
            PaymentStatus = o.PaymentStatus,
            PaymentMethod = o.PaymentMethod,
            OrderDate = o.OrderDate,
            Items = o.OrderItems.Select(i => new StoreOrderItemDto
            {
                OrderItemId = i.OrderItemId,
                ProductId = i.ProductId,
                ProductTitle = i.ProductTitle,
                ProductSlug = i.ProductSlug,
                Price = i.Price,
                Quantity = i.Quantity,
                CanDownload = o.PaymentStatus == "Paid" && i.DownloadCount < i.MaxDownloadCount,
                DownloadCount = i.DownloadCount,
                MaxDownloadCount = i.MaxDownloadCount,
            }).ToList(),
        }).ToList();
    }

    public async Task<ServiceResult<string>> GetDownloadUrlAsync(string userId, int orderId, int orderItemId)
    {
        var order = await _db.Orders.Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId);
        if (order is null) return ServiceResult<string>.Fail("NotFound", "Order not found.");
        if (order.PaymentStatus != "Paid") return ServiceResult<string>.Fail("NotPaid", "This order has not been paid for.");

        var item = order.OrderItems.FirstOrDefault(i => i.OrderItemId == orderItemId);
        if (item is null) return ServiceResult<string>.Fail("NotFound", "Order item not found.");
        if (item.DownloadCount >= item.MaxDownloadCount) return ServiceResult<string>.Fail("DownloadLimitReached", "You've used up all download attempts for this item.");

        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.ProductId == item.ProductId);
        if (product?.GoogleDriveDownloadUrl is null) return ServiceResult<string>.Fail("NoDownloadUrl", "No download is available for this item.");

        item.DownloadCount += 1;
        if (item.FirstDownloadDate is null) item.FirstDownloadDate = DateTime.UtcNow;
        item.LastDownloadDate = DateTime.UtcNow;
        product.TotalDownloads += 1;
        await _db.SaveChangesAsync();

        return ServiceResult<string>.Ok(product.GoogleDriveDownloadUrl);
    }

    private async Task<ServiceResult<CheckoutResponse>> DebitWalletForOrderAsync(string userId, int orderId)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var order = await _db.Orders.Include(o => o.OrderItems).FirstAsync(o => o.OrderId == orderId);
            var wallet = await _db.WalletCredits.FirstOrDefaultAsync(w => w.UserId == userId);
            var balance = wallet?.BalanceInr ?? 0;

            if (balance < order.FinalAmount)
            {
                order.PaymentStatus = "Failed";
                await _db.SaveChangesAsync();
                return ServiceResult<CheckoutResponse>.Fail("InsufficientBalance", "Your wallet balance is too low for this order.");
            }

            wallet!.BalanceInr = balance - order.FinalAmount;
            wallet.UpdatedAt = DateTime.UtcNow;

            _db.WalletTransactions.Add(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = -order.FinalAmount,
                Type = "spend",
                Description = $"Store order {order.OrderNumber}",
                ReferenceId = order.OrderNumber,
                CreatedAt = DateTime.UtcNow,
            });

            order.PaymentStatus = "Paid";
            order.PaymentMethod = "wallet";
            order.PaymentDate = DateTime.UtcNow;

            var productIds = order.OrderItems.Select(i => i.ProductId).Distinct().ToList();
            var products = await _db.Products.Where(p => productIds.Contains(p.ProductId)).ToListAsync();
            foreach (var item in order.OrderItems)
            {
                item.DownloadToken = Guid.NewGuid().ToString("N");
                var product = products.FirstOrDefault(p => p.ProductId == item.ProductId);
                if (product is not null)
                {
                    product.TotalSales += item.Quantity;
                    product.TotalRevenue += item.Price * item.Quantity;
                }
            }

            try
            {
                await _db.SaveChangesAsync();
                await LogOrderPaidAuditAsync(order, "wallet");
                return ServiceResult<CheckoutResponse>.Ok(new CheckoutResponse
                {
                    OrderId = order.OrderId,
                    OrderNumber = order.OrderNumber,
                    FinalAmount = order.FinalAmount,
                    AlreadyPaid = true,
                });
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.State != EntityState.Unchanged))
                    entry.State = EntityState.Detached;
            }
        }

        return ServiceResult<CheckoutResponse>.Fail("ConcurrencyConflict", "Could not complete wallet payment after retries — please try again.");
    }

    public async Task<ServiceResult<RefundStoreOrderResponse>> AdminRefundAsync(int orderId, string adminUserId, string? reason)
    {
        var order = await _db.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order is null) return ServiceResult<RefundStoreOrderResponse>.Fail("NotFound", "Order not found.");
        if (order.PaymentStatus != "Paid") return ServiceResult<RefundStoreOrderResponse>.Fail("NotRefundable", $"Only a Paid order can be refunded (current status: {order.PaymentStatus}).");
        if (!string.Equals(order.PaymentMethod, "razorpay", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(order.RazorpayPaymentId))
            return ServiceResult<RefundStoreOrderResponse>.Fail("NotRefundable", "This order wasn't paid via Razorpay — nothing to refund through the gateway.");

        var amountPaise = (long)Math.Round(order.FinalAmount * 100, MidpointRounding.AwayFromZero);
        RazorpayRefundResult refund;
        try
        {
            refund = await _razorpay.CreateRefundAsync(order.RazorpayPaymentId, amountPaise);
        }
        catch (Exception ex)
        {
            _db.PaymentLogs.Add(new PaymentLog
            {
                OrderId = order.OrderId,
                RazorpayOrderId = order.RazorpayOrderId,
                RazorpayPaymentId = order.RazorpayPaymentId,
                Event = "refund.request_failed",
                Status = order.PaymentStatus,
                Amount = amountPaise,
                Currency = order.Currency,
                IsSuccess = false,
                ErrorMessage = ex.Message,
                CreatedDate = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return ServiceResult<RefundStoreOrderResponse>.Fail("RazorpayError", "Could not process the refund with Razorpay. Please try again shortly.");
        }

        order.PaymentStatus = "Refunded";
        order.UpdatedDate = DateTime.UtcNow;

        // Flipping PaymentStatus off "Paid" alone already revokes download access — GetDownloadUrlAsync
        // and StoreOrderDto.CanDownload both gate on PaymentStatus == "Paid". Net the sale back out of
        // each product's counters too, so TotalSales/TotalRevenue reflect refunds, not gross bookings.
        var productIds = order.OrderItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await _db.Products.Where(p => productIds.Contains(p.ProductId)).ToListAsync();
        foreach (var item in order.OrderItems)
        {
            var product = products.FirstOrDefault(p => p.ProductId == item.ProductId);
            if (product is null) continue;
            product.TotalSales = Math.Max(0, product.TotalSales - item.Quantity);
            product.TotalRevenue = Math.Max(0, product.TotalRevenue - item.Price * item.Quantity);
        }

        _db.PaymentLogs.Add(new PaymentLog
        {
            OrderId = order.OrderId,
            RazorpayOrderId = order.RazorpayOrderId,
            RazorpayPaymentId = order.RazorpayPaymentId,
            Event = "refund.manual",
            Status = "Refunded",
            Amount = amountPaise,
            Currency = order.Currency,
            IsSuccess = true,
            EventData = reason,
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        return ServiceResult<RefundStoreOrderResponse>.Ok(new RefundStoreOrderResponse
        {
            OrderId = order.OrderId,
            RazorpayRefundId = refund.Id,
            Status = order.PaymentStatus,
        });
    }

    private async Task<string> GenerateUniqueOrderNumberAsync()
    {
        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        string orderNumber;
        do
        {
            var suffix = Random.Shared.Next(1000, 10000);
            orderNumber = $"ORD-{datePart}-{suffix}";
        } while (await _db.Orders.AnyAsync(o => o.OrderNumber == orderNumber));
        return orderNumber;
    }

    private static string ComputeHmacSha256Hex(string secret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var bytesA = Encoding.UTF8.GetBytes(a);
        var bytesB = Encoding.UTF8.GetBytes(b);
        if (bytesA.Length != bytesB.Length) return false;
        return CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
    }

    /// <summary>SQL Server error 2601/2627 = unique index/constraint violation.</summary>
    private static bool IsUniqueConstraintViolation(DbUpdateException ex) =>
        ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627);
}
