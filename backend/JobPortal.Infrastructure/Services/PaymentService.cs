using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Payments;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobPortal.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _db;
    private readonly IRazorpayClient _razorpay;
    private readonly RazorpaySettings _settings;
    private readonly IAuditService _audit;

    public PaymentService(AppDbContext db, IRazorpayClient razorpay, IOptions<RazorpaySettings> options, IAuditService audit)
    {
        _db = db;
        _razorpay = razorpay;
        _settings = options.Value;
        _audit = audit;
    }

    /// <summary>Writes a Billing audit row once an aspirant payment is fulfilled. Plan → a
    /// "subscription.purchased" event, WalletTopUp → "wallet.topup"; Test purchases are outside the
    /// audit scope. <paramref name="source"/> is "verify" | "webhook" | "resync".</summary>
    private async Task LogPaymentFulfilledAuditAsync(AspirantPayment payment, string source)
    {
        var isPlan = string.Equals(payment.PaymentFor, "Plan", StringComparison.OrdinalIgnoreCase);
        var isTopUp = string.Equals(payment.PaymentFor, "WalletTopUp", StringComparison.OrdinalIgnoreCase);
        if (!isPlan && !isTopUp) return;

        string? planName = null;
        if (isPlan && payment.PlanId.HasValue)
            planName = await _db.AspirantPlans.AsNoTracking()
                .Where(p => p.Id == payment.PlanId.Value).Select(p => p.Name).FirstOrDefaultAsync();

        var email = await _db.AspNetUsers.AsNoTracking()
            .Where(u => u.Id == payment.UserId).Select(u => u.Email).FirstOrDefaultAsync();

        await _audit.LogAsync(new AuditEntry
        {
            EventType = isPlan ? AuditEventTypes.SubscriptionPurchased : AuditEventTypes.WalletTopUp,
            Category = AuditEventTypes.Categories.Billing,
            Summary = isPlan
                ? $"Subscription purchased: {planName ?? $"plan #{payment.PlanId}"} (₹{payment.Amount:0.##}) by {email}"
                : $"Wallet top-up: ₹{payment.Amount:0.##} by {email}",
            ActorUserId = payment.UserId,
            ActorEmail = email,
            ActorRole = "aspirant",
            TargetType = "AspirantPayment",
            TargetId = payment.Id.ToString(),
            Metadata = new { planId = payment.PlanId, amount = payment.Amount, source },
        });
    }

    public async Task<ServiceResult<CreateOrderResponse>> CreateOrderAsync(string userId, CreateOrderRequest request)
    {
        decimal price;
        int? planId = null;
        int? testId = null;

        if (string.Equals(request.PaymentFor, "Plan", StringComparison.OrdinalIgnoreCase))
        {
            if (request.PlanId is null) return ServiceResult<CreateOrderResponse>.Fail("BadRequest", "planId is required.");
            var plan = await _db.AspirantPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.PlanId && p.IsActive);
            if (plan is null) return ServiceResult<CreateOrderResponse>.Fail("NotFound", "Plan not found.");
            price = plan.Price;
            planId = plan.Id;
        }
        else if (string.Equals(request.PaymentFor, "Test", StringComparison.OrdinalIgnoreCase))
        {
            if (request.TestId is null) return ServiceResult<CreateOrderResponse>.Fail("BadRequest", "testId is required.");
            var test = await _db.Tests.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TestId && t.IsActive);
            if (test is null) return ServiceResult<CreateOrderResponse>.Fail("NotFound", "Test not found.");
            if (test.IsFree || test.Price is null) return ServiceResult<CreateOrderResponse>.Fail("BadRequest", "This test does not require payment.");
            price = test.Price.Value;
            testId = test.Id;

            var alreadyPurchased = await _db.TestPurchases.AsNoTracking().AnyAsync(p => p.UserId == userId && p.TestId == test.Id);
            if (alreadyPurchased) return ServiceResult<CreateOrderResponse>.Fail("AlreadyPurchased", "You already own this test.");
        }
        else if (string.Equals(request.PaymentFor, "WalletTopUp", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Amount is null || request.Amount <= 0)
                return ServiceResult<CreateOrderResponse>.Fail("BadRequest", "A valid top-up amount is required.");
            price = request.Amount.Value;
        }
        else
        {
            return ServiceResult<CreateOrderResponse>.Fail("BadRequest", "paymentFor must be 'Plan', 'Test', or 'WalletTopUp'.");
        }

        var payment = new AspirantPayment
        {
            UserId = userId,
            PaymentFor = request.PaymentFor,
            PlanId = planId,
            TestId = testId,
            Amount = price,
            Currency = "INR",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        };
        _db.AspirantPayments.Add(payment);
        await _db.SaveChangesAsync();

        var amountPaise = (long)Math.Round(price * 100, MidpointRounding.AwayFromZero);
        RazorpayOrderResult order;
        try
        {
            order = await _razorpay.CreateOrderAsync(amountPaise, "INR", $"rcpt_{payment.Id}");
        }
        catch (Exception ex)
        {
            payment.Status = "Failed";
            await _db.SaveChangesAsync();
            _db.PaymentLogs.Add(new PaymentLog
            {
                AspirantPaymentId = payment.Id,
                Event = "order.create_failed",
                Status = "Failed",
                Amount = amountPaise,
                Currency = "INR",
                IsSuccess = false,
                ErrorMessage = ex.Message,
                CreatedDate = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return ServiceResult<CreateOrderResponse>.Fail("RazorpayError", "Could not create payment order. Please try again shortly.");
        }

        payment.RazorpayOrderId = order.Id;
        _db.PaymentLogs.Add(new PaymentLog
        {
            AspirantPaymentId = payment.Id,
            RazorpayOrderId = order.Id,
            Event = "order.created",
            Status = "Pending",
            Amount = amountPaise,
            Currency = "INR",
            IsSuccess = true,
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        return ServiceResult<CreateOrderResponse>.Ok(new CreateOrderResponse
        {
            PaymentId = payment.Id,
            RazorpayOrderId = order.Id,
            Amount = amountPaise,
            Currency = "INR",
            KeyId = _settings.KeyId,
        });
    }

    public async Task<ServiceResult<VerifyPaymentResponse>> VerifyPaymentAsync(string userId, VerifyPaymentRequest request)
    {
        var payment = await _db.AspirantPayments.FirstOrDefaultAsync(p =>
            p.UserId == userId && p.RazorpayOrderId == request.RazorpayOrderId);
        if (payment is null) return ServiceResult<VerifyPaymentResponse>.Fail("NotFound", "No payment found for this order.");

        // Idempotency: a retried /verify call (client timeout, or a race with the payment.captured
        // webhook) for a payment that's already been applied returns the same result instead of
        // re-crediting/re-subscribing or erroring.
        if (payment.Status == "Paid" && payment.RazorpayPaymentId == request.RazorpayPaymentId)
        {
            return ServiceResult<VerifyPaymentResponse>.Ok(new VerifyPaymentResponse
            {
                Unlocked = true,
                PaymentFor = payment.PaymentFor,
                TestId = payment.TestId,
            });
        }
        if (payment.Status != "Pending")
            return ServiceResult<VerifyPaymentResponse>.Fail("NotPending", $"This payment is already {payment.Status}.");

        var expectedSignature = ComputeHmacSha256Hex(_settings.KeySecret, $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}");
        var isValid = FixedTimeEquals(expectedSignature, request.RazorpaySignature);

        if (!isValid)
        {
            payment.Status = "Failed";
            await _db.SaveChangesAsync();
            _db.PaymentLogs.Add(new PaymentLog
            {
                AspirantPaymentId = payment.Id,
                RazorpayOrderId = request.RazorpayOrderId,
                RazorpayPaymentId = request.RazorpayPaymentId,
                Event = "payment.verify_failed",
                Status = "Failed",
                IsSuccess = false,
                ErrorMessage = "Signature mismatch.",
                CreatedDate = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return ServiceResult<VerifyPaymentResponse>.Fail("SignatureMismatch", "Payment verification failed.");
        }

        if (string.Equals(payment.PaymentFor, "WalletTopUp", StringComparison.OrdinalIgnoreCase))
        {
            return await VerifyWalletTopUpAsync(userId, payment.Id, request);
        }

        // debit/credit (none here — Razorpay already collected the money) + payment-status + the
        // Subscription/TestPurchase "counter" row, in one DB transaction. IsUniqueConstraintViolation
        // catches the residual true-concurrent race against the webhook's own fulfillment path:
        // whichever writer loses re-reads and returns the winner's result instead of an error.
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            payment.Status = "Paid";
            payment.PaidAt = DateTime.UtcNow;
            payment.RazorpayPaymentId = request.RazorpayPaymentId;
            payment.RazorpaySignature = request.RazorpaySignature;

            if (string.Equals(payment.PaymentFor, "Plan", StringComparison.OrdinalIgnoreCase) && payment.PlanId.HasValue)
            {
                var plan = await _db.AspirantPlans.FirstAsync(p => p.Id == payment.PlanId.Value);
                _db.Subscriptions.Add(new Subscription
                {
                    UserId = userId,
                    PlanId = plan.Id,
                    Price = payment.Amount,
                    StartsAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddDays(plan.DurationDays),
                    Status = "active",
                    PaymentId = payment.Id,
                    CreatedAt = DateTime.UtcNow,
                });
            }
            else if (string.Equals(payment.PaymentFor, "Test", StringComparison.OrdinalIgnoreCase) && payment.TestId.HasValue)
            {
                var alreadyPurchased = await _db.TestPurchases.AnyAsync(p => p.UserId == userId && p.TestId == payment.TestId.Value);
                if (!alreadyPurchased)
                {
                    _db.TestPurchases.Add(new TestPurchase
                    {
                        UserId = userId,
                        TestId = payment.TestId.Value,
                        Price = payment.Amount,
                        PurchasedAt = DateTime.UtcNow,
                        PaymentId = payment.Id,
                    });
                }
            }

            _db.PaymentLogs.Add(new PaymentLog
            {
                AspirantPaymentId = payment.Id,
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
            var winner = await _db.AspirantPayments.AsNoTracking().FirstOrDefaultAsync(p => p.RazorpayPaymentId == request.RazorpayPaymentId);
            if (winner is not null)
            {
                return ServiceResult<VerifyPaymentResponse>.Ok(new VerifyPaymentResponse
                {
                    Unlocked = true,
                    PaymentFor = winner.PaymentFor,
                    TestId = winner.TestId,
                });
            }
            throw;
        }

        await LogPaymentFulfilledAuditAsync(payment, "verify");

        return ServiceResult<VerifyPaymentResponse>.Ok(new VerifyPaymentResponse
        {
            Unlocked = true,
            PaymentFor = payment.PaymentFor,
            TestId = payment.TestId,
        });
    }

    public async Task<bool> HandleWebhookAsync(string rawBody, string? signatureHeader)
    {
        if (string.IsNullOrEmpty(signatureHeader))
        {
            await LogWebhookReceiptAsync(null, null, null, null, null, "webhook.signature_missing", rawBody, "Missing X-Razorpay-Signature header.");
            return false;
        }

        var expected = ComputeHmacSha256Hex(_settings.WebhookSecret, rawBody);
        if (!FixedTimeEquals(expected, signatureHeader))
        {
            await LogWebhookReceiptAsync(null, null, null, null, null, "webhook.signature_invalid", rawBody,
                "HMAC-SHA256(rawBody) did not match X-Razorpay-Signature — check Razorpay:WebhookSecret configuration.");
            return false;
        }

        string eventName;
        long? createdAt;
        JsonElement root;
        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            root = doc.RootElement.Clone();
            eventName = root.TryGetProperty("event", out var evEl) ? evEl.GetString() ?? "unknown" : "unknown";
            createdAt = root.TryGetProperty("created_at", out var caEl) && caEl.TryGetInt64(out var ca) ? ca : null;
        }
        catch (JsonException)
        {
            await LogWebhookReceiptAsync(null, null, null, null, null, "webhook.malformed_json", rawBody,
                "Signature was valid but the body was not parseable JSON.");
            return false;
        }

        string? orderId = null;
        string? paymentId = null;
        if (root.TryGetProperty("payload", out var payloadEl))
        {
            if (payloadEl.TryGetProperty("payment", out var paymentEl) && paymentEl.TryGetProperty("entity", out var payEntity))
            {
                orderId = payEntity.TryGetProperty("order_id", out var oid) ? oid.GetString() : null;
                paymentId = payEntity.TryGetProperty("id", out var pid) ? pid.GetString() : null;
            }
            if (orderId is null && payloadEl.TryGetProperty("order", out var orderEl) && orderEl.TryGetProperty("entity", out var orderEntity))
            {
                orderId = orderEntity.TryGetProperty("id", out var oid2) ? oid2.GetString() : null;
            }
            if (payloadEl.TryGetProperty("refund", out var refundEl) && refundEl.TryGetProperty("entity", out var refEntity))
            {
                paymentId ??= refEntity.TryGetProperty("payment_id", out var rpid) ? rpid.GetString() : null;
            }

            if (eventName.StartsWith("payment.dispute.", StringComparison.OrdinalIgnoreCase)
                && payloadEl.TryGetProperty("dispute", out var disputeEl) && disputeEl.TryGetProperty("entity", out var disputeEntity))
            {
                await UpsertDisputeAsync(disputeEntity, eventName);
                paymentId ??= disputeEntity.TryGetProperty("payment_id", out var dpid) ? dpid.GetString() : null;
            }
        }

        // Razorpay sends no canonical event id / X-Razorpay-Event-Id header, so this key is
        // synthesized for audit/dedup visibility only — see the RazorpayEventId doc comment.
        var eventKey = $"{eventName}:{orderId ?? paymentId ?? "-"}:{createdAt?.ToString() ?? "-"}";

        AspirantPayment? payment = null;
        if (!string.IsNullOrEmpty(orderId))
            payment = await _db.AspirantPayments.FirstOrDefaultAsync(p => p.RazorpayOrderId == orderId);
        else if (!string.IsNullOrEmpty(paymentId))
            payment = await _db.AspirantPayments.FirstOrDefaultAsync(p => p.RazorpayPaymentId == paymentId);

        var isDuplicate = false;
        var fulfilledNow = false;
        if (payment is not null)
        {
            var isCaptureEvent = eventName.Equals("payment.captured", StringComparison.OrdinalIgnoreCase)
                || eventName.Equals("order.paid", StringComparison.OrdinalIgnoreCase);

            if (isCaptureEvent)
            {
                if (payment.Status == "Pending")
                {
                    await FulfillCapturedPaymentAsync(payment, paymentId);
                    fulfilledNow = true;
                }
                else
                    isDuplicate = true; // already Paid/Failed/Refunded — redelivery of an event we've already handled
            }
            else if (eventName.StartsWith("payment.failed", StringComparison.OrdinalIgnoreCase) && payment.Status == "Pending")
            {
                payment.Status = "Failed";
            }
            else if (eventName.StartsWith("refund.", StringComparison.OrdinalIgnoreCase))
            {
                payment.Status = "Refunded";
            }
        }

        _db.PaymentLogs.Add(new PaymentLog
        {
            AspirantPaymentId = payment?.Id,
            RazorpayOrderId = orderId,
            RazorpayPaymentId = paymentId,
            RazorpayEventId = eventKey,
            Event = isDuplicate ? $"{eventName}.duplicate" : eventName,
            Status = payment?.Status,
            IsSuccess = true,
            EventData = rawBody.Length > 4000 ? rawBody[..4000] : rawBody,
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        if (fulfilledNow && payment is not null)
            await LogPaymentFulfilledAuditAsync(payment, "webhook");

        return true;
    }

    /// <summary>
    /// Applies the same Plan/Test/WalletTopUp fulfillment VerifyPaymentAsync performs after a
    /// client-submitted signature check, but triggered server-to-server from a webhook instead —
    /// duplicated rather than shared with VerifyPaymentAsync/ResyncPaymentAsync on purpose, matching
    /// this codebase's existing convention of not refactoring already-verified live-payment code
    /// paths (see employerRazorpayCheckout.ts vs razorpayCheckout.ts). Caller must already have
    /// confirmed payment.Status == "Pending" — that check is the actual idempotency guarantee for
    /// duplicate webhook deliveries, not anything in here.
    /// </summary>
    private async Task FulfillCapturedPaymentAsync(AspirantPayment payment, string? razorpayPaymentId)
    {
        if (string.Equals(payment.PaymentFor, "WalletTopUp", StringComparison.OrdinalIgnoreCase))
        {
            var paymentId = payment.Id;
            var userId = payment.UserId;
            var amount = payment.Amount;
            const int maxAttempts = 3;
            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                var p = await _db.AspirantPayments.FirstAsync(x => x.Id == paymentId);
                p.Status = "Paid";
                p.PaidAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(razorpayPaymentId)) p.RazorpayPaymentId = razorpayPaymentId;

                var wallet = await _db.WalletCredits.FirstOrDefaultAsync(w => w.UserId == userId);
                if (wallet is null)
                {
                    wallet = new WalletCredit { Id = Guid.NewGuid(), UserId = userId, BalanceInr = 0, UpdatedAt = DateTime.UtcNow };
                    _db.WalletCredits.Add(wallet);
                }
                wallet.BalanceInr += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                _db.WalletTransactions.Add(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Amount = amount,
                    Type = "top_up",
                    Description = "Razorpay wallet top-up (webhook)",
                    ReferenceId = $"payment_{paymentId}",
                    CreatedAt = DateTime.UtcNow,
                });

                try
                {
                    await _db.SaveChangesAsync();
                    return;
                }
                catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
                {
                    foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.State != EntityState.Unchanged))
                        entry.State = EntityState.Detached;
                }
            }

            throw new InvalidOperationException($"Wallet credit failed after {maxAttempts} attempts for payment {paymentId} (webhook path).");
        }

        payment.Status = "Paid";
        payment.PaidAt = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(razorpayPaymentId)) payment.RazorpayPaymentId = razorpayPaymentId;

        if (string.Equals(payment.PaymentFor, "Plan", StringComparison.OrdinalIgnoreCase) && payment.PlanId.HasValue)
        {
            var plan = await _db.AspirantPlans.FirstAsync(p => p.Id == payment.PlanId.Value);
            _db.Subscriptions.Add(new Subscription
            {
                UserId = payment.UserId,
                PlanId = plan.Id,
                Price = payment.Amount,
                StartsAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(plan.DurationDays),
                Status = "active",
                PaymentId = payment.Id,
                CreatedAt = DateTime.UtcNow,
            });
        }
        else if (string.Equals(payment.PaymentFor, "Test", StringComparison.OrdinalIgnoreCase) && payment.TestId.HasValue)
        {
            var alreadyPurchased = await _db.TestPurchases.AnyAsync(p => p.UserId == payment.UserId && p.TestId == payment.TestId.Value);
            if (!alreadyPurchased)
            {
                _db.TestPurchases.Add(new TestPurchase
                {
                    UserId = payment.UserId,
                    TestId = payment.TestId.Value,
                    Price = payment.Amount,
                    PurchasedAt = DateTime.UtcNow,
                    PaymentId = payment.Id,
                });
            }
        }
    }

    /// <summary>Creates or updates the Dispute row for this Razorpay dispute id — every phase change
    /// (created/under_review/action_required/won/lost/closed) resends the full dispute entity, so
    /// this is a plain upsert keyed on RazorpayDisputeId rather than separate per-event logic.
    /// Doesn't SaveChanges itself; the caller's webhook-receipt save covers this too.</summary>
    private async Task UpsertDisputeAsync(JsonElement disputeEntity, string eventName)
    {
        var razorpayDisputeId = disputeEntity.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
        if (string.IsNullOrEmpty(razorpayDisputeId)) return;

        var razorpayPaymentId = disputeEntity.TryGetProperty("payment_id", out var pidEl) ? pidEl.GetString() ?? "" : "";
        var amount = disputeEntity.TryGetProperty("amount", out var amtEl) && amtEl.TryGetInt64(out var amt) ? amt : 0;
        var amountDeducted = disputeEntity.TryGetProperty("amount_deducted", out var adEl) && adEl.TryGetInt64(out var ad) ? ad : 0;
        var currency = disputeEntity.TryGetProperty("currency", out var curEl) ? curEl.GetString() ?? "INR" : "INR";
        var reasonCode = disputeEntity.TryGetProperty("reason_code", out var rcEl) ? rcEl.GetString() : null;
        var status = disputeEntity.TryGetProperty("status", out var stEl) ? stEl.GetString() ?? "open" : "open";
        var phase = disputeEntity.TryGetProperty("phase", out var phEl) ? phEl.GetString() : null;
        DateTime? respondBy = disputeEntity.TryGetProperty("respond_by", out var rbEl) && rbEl.TryGetInt64(out var rb)
            ? DateTimeOffset.FromUnixTimeSeconds(rb).UtcDateTime
            : null;

        var dispute = await _db.Disputes.FirstOrDefaultAsync(d => d.RazorpayDisputeId == razorpayDisputeId);
        var isNew = dispute is null;
        dispute ??= new Dispute { RazorpayDisputeId = razorpayDisputeId, CreatedDate = DateTime.UtcNow };

        dispute.RazorpayPaymentId = razorpayPaymentId;
        dispute.Amount = amount;
        dispute.AmountDeducted = amountDeducted;
        dispute.Currency = currency;
        dispute.ReasonCode = reasonCode;
        dispute.Status = status;
        dispute.Phase = phase;
        dispute.RespondBy = respondBy;
        dispute.LastEventName = eventName;
        dispute.UpdatedDate = DateTime.UtcNow;

        if (isNew && !string.IsNullOrEmpty(razorpayPaymentId))
        {
            var linkedPayment = await _db.AspirantPayments.AsNoTracking().FirstOrDefaultAsync(p => p.RazorpayPaymentId == razorpayPaymentId);
            if (linkedPayment is not null)
            {
                dispute.AspirantPaymentId = linkedPayment.Id;
            }
            else
            {
                var linkedOrder = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.RazorpayPaymentId == razorpayPaymentId);
                if (linkedOrder is not null) dispute.OrderId = linkedOrder.OrderId;
            }
        }

        if (isNew) _db.Disputes.Add(dispute);
    }

    private async Task LogWebhookReceiptAsync(int? aspirantPaymentId, string? orderId, string? paymentId, string? status, string? eventKey, string eventLabel, string rawBody, string? errorMessage)
    {
        _db.PaymentLogs.Add(new PaymentLog
        {
            AspirantPaymentId = aspirantPaymentId,
            RazorpayOrderId = orderId,
            RazorpayPaymentId = paymentId,
            RazorpayEventId = eventKey,
            Event = eventLabel,
            Status = status,
            IsSuccess = false,
            ErrorMessage = errorMessage,
            EventData = rawBody.Length > 4000 ? rawBody[..4000] : rawBody,
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
    }

    public async Task<PaymentHistoryDto> GetHistoryAsync(string userId)
    {
        var payments = await _db.AspirantPayments.AsNoTracking()
            .Include(p => p.Plan)
            .Include(p => p.Test)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PaymentHistoryItemDto
            {
                Id = p.Id,
                PaymentFor = p.PaymentFor,
                PlanName = p.Plan != null ? p.Plan.Name : null,
                TestTitle = p.Test != null ? p.Test.Title : null,
                Amount = p.Amount,
                Currency = p.Currency,
                Status = p.Status,
                RazorpayPaymentId = p.RazorpayPaymentId,
                CreatedAt = p.CreatedAt,
                PaidAt = p.PaidAt,
            })
            .ToListAsync();

        var activeSub = await _db.Subscriptions.AsNoTracking().Include(s => s.Plan)
            .Where(s => s.UserId == userId && s.Status == "active" && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.ExpiresAt)
            .FirstOrDefaultAsync();

        return new PaymentHistoryDto
        {
            Payments = payments,
            ActiveSubscription = activeSub is null ? null : new ActiveSubscriptionDto
            {
                PlanName = activeSub.Plan.Name,
                ExpiresAt = activeSub.ExpiresAt,
            },
        };
    }

    public async Task<ServiceResult<RefundPaymentResponse>> AdminRefundAsync(int paymentId, string adminUserId, string? reason)
    {
        var payment = await _db.AspirantPayments.FirstOrDefaultAsync(p => p.Id == paymentId);
        if (payment is null) return ServiceResult<RefundPaymentResponse>.Fail("NotFound", "Payment not found.");
        if (payment.Status != "Paid") return ServiceResult<RefundPaymentResponse>.Fail("NotRefundable", $"Only a Paid payment can be refunded (current status: {payment.Status}).");
        if (string.IsNullOrEmpty(payment.RazorpayPaymentId)) return ServiceResult<RefundPaymentResponse>.Fail("NotRefundable", "Payment has no Razorpay payment id on record.");

        var amountPaise = (long)Math.Round(payment.Amount * 100, MidpointRounding.AwayFromZero);
        RazorpayRefundResult refund;
        try
        {
            refund = await _razorpay.CreateRefundAsync(payment.RazorpayPaymentId, amountPaise);
        }
        catch (Exception ex)
        {
            _db.PaymentLogs.Add(new PaymentLog
            {
                AspirantPaymentId = payment.Id,
                RazorpayOrderId = payment.RazorpayOrderId,
                RazorpayPaymentId = payment.RazorpayPaymentId,
                Event = "refund.request_failed",
                Status = payment.Status,
                Amount = amountPaise,
                Currency = payment.Currency,
                IsSuccess = false,
                ErrorMessage = ex.Message,
                CreatedDate = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return ServiceResult<RefundPaymentResponse>.Fail("RazorpayError", "Could not process the refund with Razorpay. Please try again shortly.");
        }

        payment.Status = "Refunded";

        var accessRevoked = false;
        string? reversalNote = null;
        if (string.Equals(payment.PaymentFor, "Plan", StringComparison.OrdinalIgnoreCase))
        {
            var subscription = await _db.Subscriptions.FirstOrDefaultAsync(s => s.PaymentId == payment.Id);
            if (subscription is not null)
            {
                subscription.Status = "refunded";
                accessRevoked = true;
            }
        }
        else if (string.Equals(payment.PaymentFor, "Test", StringComparison.OrdinalIgnoreCase))
        {
            // TestPurchase has no status column — owning the test is purely row existence, so
            // revoking access on refund means removing the row rather than flagging it inactive.
            var purchase = await _db.TestPurchases.FirstOrDefaultAsync(p => p.PaymentId == payment.Id);
            if (purchase is not null)
            {
                _db.TestPurchases.Remove(purchase);
                accessRevoked = true;
            }
        }
        else if (string.Equals(payment.PaymentFor, "WalletTopUp", StringComparison.OrdinalIgnoreCase))
        {
            // The user may have already spent some or all of the credited balance before an admin
            // gets to process the refund — claw back what's actually still there and floor at 0
            // rather than let this push the wallet negative.
            (accessRevoked, reversalNote) = await ReverseWalletTopUpAsync(payment.UserId, payment.Id, payment.Amount);
        }

        _db.PaymentLogs.Add(new PaymentLog
        {
            AspirantPaymentId = payment.Id,
            RazorpayOrderId = payment.RazorpayOrderId,
            RazorpayPaymentId = payment.RazorpayPaymentId,
            Event = "refund.manual",
            Status = "Refunded",
            Amount = amountPaise,
            Currency = payment.Currency,
            IsSuccess = true,
            EventData = reversalNote is null ? reason : $"{reason} | {reversalNote}",
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        return ServiceResult<RefundPaymentResponse>.Ok(new RefundPaymentResponse
        {
            PaymentId = payment.Id,
            RazorpayRefundId = refund.Id,
            Status = payment.Status,
            AccessRevoked = accessRevoked,
        });
    }

    /// <summary>Claws back up to <paramref name="grantedAmount"/> from the user's wallet balance,
    /// floored at 0. Returns whether the full granted amount was recovered, and a note describing
    /// a partial recovery (already spent) for the refund's audit log. RowVersion-retry-safe, same
    /// pattern as the wallet-credit paths elsewhere in this file.</summary>
    private async Task<(bool FullyRecovered, string? Note)> ReverseWalletTopUpAsync(string userId, int paymentId, decimal grantedAmount)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var wallet = await _db.WalletCredits.FirstOrDefaultAsync(w => w.UserId == userId);
            var available = wallet?.BalanceInr ?? 0;
            var toReverse = Math.Min(grantedAmount, available);

            if (toReverse > 0)
            {
                wallet!.BalanceInr = available - toReverse;
                wallet.UpdatedAt = DateTime.UtcNow;

                _db.WalletTransactions.Add(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Amount = -toReverse,
                    Type = "refund_reversal",
                    Description = "Wallet top-up refunded by admin",
                    ReferenceId = $"payment_{paymentId}",
                    CreatedAt = DateTime.UtcNow,
                });
            }

            try
            {
                await _db.SaveChangesAsync();
                var fullyRecovered = toReverse >= grantedAmount;
                var note = fullyRecovered
                    ? null
                    : $"Only ₹{toReverse} of the ₹{grantedAmount} granted could be clawed back — the rest had already been spent.";
                return (fullyRecovered, note);
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                // Detach only the WalletCredit/WalletTransaction entries this attempt touched — the
                // caller (AdminRefundAsync) already has payment.Status = "Refunded" pending in the
                // same change tracker, and that must survive a retry here, not get wiped along with
                // the stale wallet state.
                foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.Entity is WalletCredit or WalletTransaction))
                    entry.State = EntityState.Detached;
            }
        }

        return (false, "Could not reverse the wallet credit after retries — balance was not adjusted.");
    }

    public async Task<List<DisputeDto>> GetDisputesAsync(string? status = null)
    {
        var q = _db.Disputes.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(d => d.Status == status);

        return await q.OrderByDescending(d => d.CreatedDate).Select(d => new DisputeDto
        {
            Id = d.Id,
            RazorpayDisputeId = d.RazorpayDisputeId,
            RazorpayPaymentId = d.RazorpayPaymentId,
            Amount = d.Amount,
            AmountDeducted = d.AmountDeducted,
            Currency = d.Currency,
            ReasonCode = d.ReasonCode,
            Status = d.Status,
            Phase = d.Phase,
            RespondBy = d.RespondBy,
            AspirantPaymentId = d.AspirantPaymentId,
            OrderId = d.OrderId,
            LastEventName = d.LastEventName,
            CreatedDate = d.CreatedDate,
            UpdatedDate = d.UpdatedDate,
        }).ToListAsync();
    }

    public async Task<RazorpayHealthDto> CheckRazorpayHealthAsync()
    {
        var probe = await _razorpay.CheckAuthAsync();
        var keyId = _settings.KeyId;
        var keySecret = _settings.KeySecret;
        var webhookSecret = _settings.WebhookSecret;

        return new RazorpayHealthDto
        {
            Authenticated = probe.Ok,
            ProbeStatusCode = probe.StatusCode,
            Detail = probe.Detail,
            KeyIdConfigured = !string.IsNullOrWhiteSpace(keyId),
            KeyIdMasked = string.IsNullOrWhiteSpace(keyId)
                ? null
                : keyId.Length <= 8 ? "****" : $"{keyId[..8]}…{keyId[^2..]}",
            KeySecretConfigured = !string.IsNullOrWhiteSpace(keySecret),
            WebhookSecretConfigured = !string.IsNullOrWhiteSpace(webhookSecret),
            WebhookSecretEqualsKeySecret = !string.IsNullOrWhiteSpace(keySecret)
                && string.Equals(keySecret, webhookSecret, StringComparison.Ordinal),
        };
    }

    public async Task<List<StuckPaymentDto>> GetStuckPendingPaymentsAsync(int olderThanMinutes = 30)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-olderThanMinutes);
        return await _db.AspirantPayments.AsNoTracking()
            .Where(p => p.Status == "Pending" && p.CreatedAt <= cutoff && p.RazorpayOrderId != null)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new StuckPaymentDto
            {
                PaymentId = p.Id,
                UserId = p.UserId,
                PaymentFor = p.PaymentFor,
                Amount = p.Amount,
                RazorpayOrderId = p.RazorpayOrderId,
                CreatedAt = p.CreatedAt,
                MinutesPending = (int)(DateTime.UtcNow - p.CreatedAt).TotalMinutes,
            })
            .ToListAsync();
    }

    public async Task<ServiceResult<ResyncPaymentResponse>> ResyncPaymentAsync(int paymentId)
    {
        var payment = await _db.AspirantPayments.FirstOrDefaultAsync(p => p.Id == paymentId);
        if (payment is null) return ServiceResult<ResyncPaymentResponse>.Fail("NotFound", "Payment not found.");
        if (payment.Status != "Pending") return ServiceResult<ResyncPaymentResponse>.Fail("AlreadyResolved", $"Payment is already {payment.Status}; nothing to resync.");
        if (string.IsNullOrEmpty(payment.RazorpayOrderId)) return ServiceResult<ResyncPaymentResponse>.Fail("NoOrder", "Payment never got a Razorpay order id.");

        IReadOnlyList<RazorpayPaymentStatusResult> attempts;
        try
        {
            attempts = await _razorpay.FetchOrderPaymentsAsync(payment.RazorpayOrderId);
        }
        catch (Exception ex)
        {
            return ServiceResult<ResyncPaymentResponse>.Fail("RazorpayError", $"Could not reach Razorpay to reconcile this order: {ex.Message}");
        }

        var captured = attempts.FirstOrDefault(a => a.Status == "captured") ?? attempts.FirstOrDefault(a => a.Status == "authorized");
        if (captured is not null)
        {
            payment.Status = "Paid";
            payment.PaidAt = DateTime.UtcNow;
            payment.RazorpayPaymentId = captured.Id;

            if (string.Equals(payment.PaymentFor, "Plan", StringComparison.OrdinalIgnoreCase) && payment.PlanId.HasValue)
            {
                var plan = await _db.AspirantPlans.FirstAsync(p => p.Id == payment.PlanId.Value);
                _db.Subscriptions.Add(new Subscription
                {
                    UserId = payment.UserId,
                    PlanId = plan.Id,
                    Price = payment.Amount,
                    StartsAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddDays(plan.DurationDays),
                    Status = "active",
                    PaymentId = payment.Id,
                    CreatedAt = DateTime.UtcNow,
                });
            }
            else if (string.Equals(payment.PaymentFor, "Test", StringComparison.OrdinalIgnoreCase) && payment.TestId.HasValue)
            {
                var alreadyPurchased = await _db.TestPurchases.AnyAsync(p => p.UserId == payment.UserId && p.TestId == payment.TestId.Value);
                if (!alreadyPurchased)
                {
                    _db.TestPurchases.Add(new TestPurchase
                    {
                        UserId = payment.UserId,
                        TestId = payment.TestId.Value,
                        Price = payment.Amount,
                        PurchasedAt = DateTime.UtcNow,
                        PaymentId = payment.Id,
                    });
                }
            }
        }
        else if (attempts.Any(a => a.Status == "failed"))
        {
            payment.Status = "Failed";
        }

        _db.PaymentLogs.Add(new PaymentLog
        {
            AspirantPaymentId = payment.Id,
            RazorpayOrderId = payment.RazorpayOrderId,
            RazorpayPaymentId = payment.RazorpayPaymentId,
            Event = "payment.resynced",
            Status = payment.Status,
            IsSuccess = true,
            EventData = $"Found {attempts.Count} Razorpay payment attempt(s) for this order.",
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        if (payment.Status == "Paid")
            await LogPaymentFulfilledAuditAsync(payment, "resync");

        return ServiceResult<ResyncPaymentResponse>.Ok(new ResyncPaymentResponse
        {
            PaymentId = payment.Id,
            ResolvedStatus = payment.Status == "Paid" ? "Paid" : payment.Status == "Failed" ? "Failed" : "StillPending",
            RazorpayPaymentId = payment.RazorpayPaymentId,
        });
    }

    private async Task<ServiceResult<VerifyPaymentResponse>> VerifyWalletTopUpAsync(string userId, int paymentId, VerifyPaymentRequest request)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var payment = await _db.AspirantPayments.FirstAsync(p => p.Id == paymentId);
            payment.Status = "Paid";
            payment.PaidAt = DateTime.UtcNow;
            payment.RazorpayPaymentId = request.RazorpayPaymentId;
            payment.RazorpaySignature = request.RazorpaySignature;

            var wallet = await _db.WalletCredits.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet is null)
            {
                wallet = new WalletCredit { Id = Guid.NewGuid(), UserId = userId, BalanceInr = 0, UpdatedAt = DateTime.UtcNow };
                _db.WalletCredits.Add(wallet);
            }
            wallet.BalanceInr += payment.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            _db.WalletTransactions.Add(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = payment.Amount,
                Type = "top_up",
                Description = "Razorpay wallet top-up",
                ReferenceId = $"payment_{payment.Id}",
                CreatedAt = DateTime.UtcNow,
            });

            _db.PaymentLogs.Add(new PaymentLog
            {
                AspirantPaymentId = payment.Id,
                RazorpayOrderId = request.RazorpayOrderId,
                RazorpayPaymentId = request.RazorpayPaymentId,
                Event = "payment.verified",
                Status = "Paid",
                IsSuccess = true,
                CreatedDate = DateTime.UtcNow,
            });

            try
            {
                await _db.SaveChangesAsync();
                await LogPaymentFulfilledAuditAsync(payment, "verify");
                return ServiceResult<VerifyPaymentResponse>.Ok(new VerifyPaymentResponse { Unlocked = true, PaymentFor = "WalletTopUp" });
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                foreach (var entry in _db.ChangeTracker.Entries().Where(e => e.State != EntityState.Unchanged))
                    entry.State = EntityState.Detached;
            }
        }

        return ServiceResult<VerifyPaymentResponse>.Fail("WalletCreditFailed", "Payment succeeded but crediting your wallet failed after retries — contact support with your payment ID.");
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
