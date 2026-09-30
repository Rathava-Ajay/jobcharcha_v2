using System.Security.Cryptography;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JobPortal.Infrastructure.Services;

public class EmployerBillingService : IEmployerBillingService
{
    private readonly AppDbContext _db;
    private readonly IRazorpayClient _razorpay;
    private readonly RazorpaySettings _settings;
    private readonly IAuditService _audit;

    public EmployerBillingService(AppDbContext db, IRazorpayClient razorpay, IOptions<RazorpaySettings> options, IAuditService audit)
    {
        _db = db;
        _razorpay = razorpay;
        _settings = options.Value;
        _audit = audit;
    }

    public async Task<EmployerSubscriptionDto> GetSubscriptionAsync(int employerProfileId)
    {
        var sub = await _db.EmployerSubscriptions.AsNoTracking()
            .Where(s => s.EmployerProfileId == employerProfileId)
            .OrderByDescending(s => s.EndDate)
            .FirstOrDefaultAsync();

        if (sub is null) return new EmployerSubscriptionDto { Status = "none" };

        var today = DateTime.UtcNow.Date;
        var daysRemaining = (int)Math.Ceiling((sub.EndDate.Date - today).TotalDays);

        return new EmployerSubscriptionDto
        {
            Id = sub.Id,
            PlanName = sub.PlanName,
            Status = sub.Status ?? (sub.EndDate.Date >= today ? "active" : "expired"),
            StartDate = sub.StartDate,
            EndDate = sub.EndDate,
            DaysRemaining = daysRemaining < 0 ? 0 : daysRemaining,
            AutoRenew = sub.AutoRenew,
            MaxActiveJobs = sub.MaxActiveJobs,
            MaxFeaturedJobs = sub.MaxFeaturedJobs,
            CanAccessResumes = sub.CanAccessResumes,
        };
    }

    public async Task<EmployerCreditsDto> GetCreditsAsync(int employerProfileId)
    {
        var credits = await _db.EmployerCredits.AsNoTracking().FirstOrDefaultAsync(c => c.EmployerProfileId == employerProfileId);
        if (credits is null) return new EmployerCreditsDto { TotalCredits = 0, UsedCredits = 0, CreditsRemaining = 0, IsUnlimited = false };

        return new EmployerCreditsDto
        {
            TotalCredits = credits.TotalCredits,
            UsedCredits = credits.UsedCredits,
            CreditsRemaining = credits.CreditsRemaining,
            IsUnlimited = credits.IsUnlimited,
        };
    }

    public Task<ServiceResult<EmployerCreateOrderResponse>> CreateRenewOrderAsync(int employerProfileId, RenewSubscriptionRequest request) =>
        CreateOrderInternalAsync(employerProfileId, request.EmployerPlanId, expectTopUp: false);

    public Task<ServiceResult<EmployerCreateOrderResponse>> CreateTopUpOrderAsync(int employerProfileId, TopUpCreditsRequest request) =>
        CreateOrderInternalAsync(employerProfileId, request.EmployerPlanId, expectTopUp: true);

    private async Task<ServiceResult<EmployerCreateOrderResponse>> CreateOrderInternalAsync(int employerProfileId, int employerPlanId, bool expectTopUp)
    {
        var plan = await _db.EmployerPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == employerPlanId && p.IsActive);
        if (plan is null) return ServiceResult<EmployerCreateOrderResponse>.Fail("NotFound", "Plan not found.");
        if (plan.IsTopUp != expectTopUp)
            return ServiceResult<EmployerCreateOrderResponse>.Fail("BadRequest", expectTopUp ? "That plan is not a credit top-up pack." : "That plan is a credit top-up pack, not a subscription plan.");

        if (expectTopUp)
        {
            var anyCandidates = await _db.JobSeekerProfiles.AsNoTracking().AnyAsync();
            if (!anyCandidates)
                return ServiceResult<EmployerCreateOrderResponse>.Fail("NoCandidates", "There are no candidate profiles on the platform yet, so there's nothing to unlock with contact credits. Check back once aspirants have registered.");
        }

        var payment = new EmployerPayment
        {
            EmployerProfileId = employerProfileId,
            EmployerPlanId = plan.Id,
            Amount = plan.Price,
            Currency = "INR",
            Status = "Pending",
            CreatedDate = DateTime.UtcNow,
        };
        _db.EmployerPayments.Add(payment);
        await _db.SaveChangesAsync();

        var amountPaise = (long)Math.Round(plan.Price * 100, MidpointRounding.AwayFromZero);
        try
        {
            var order = await _razorpay.CreateOrderAsync(amountPaise, "INR", $"emp_rcpt_{payment.Id}");
            payment.RazorpayOrderId = order.Id;
            await _db.SaveChangesAsync();

            return ServiceResult<EmployerCreateOrderResponse>.Ok(new EmployerCreateOrderResponse
            {
                PaymentId = payment.Id,
                RazorpayOrderId = order.Id,
                Amount = amountPaise,
                Currency = "INR",
                KeyId = _settings.KeyId,
            });
        }
        catch (Exception ex)
        {
            payment.Status = "Failed";
            await _db.SaveChangesAsync();
            return ServiceResult<EmployerCreateOrderResponse>.Fail("RazorpayError", $"Could not create payment order: {ex.Message}");
        }
    }

    public async Task<ServiceResult<EmployerVerifyPaymentResponse>> VerifyPaymentAsync(int employerProfileId, EmployerVerifyPaymentRequest request)
    {
        var payment = await _db.EmployerPayments.Include(p => p.Plan).FirstOrDefaultAsync(p =>
            p.EmployerProfileId == employerProfileId && p.RazorpayOrderId == request.RazorpayOrderId && p.Status == "Pending");
        if (payment is null) return ServiceResult<EmployerVerifyPaymentResponse>.Fail("NotFound", "No pending payment found for this order.");

        var expectedSignature = ComputeHmacSha256Hex(_settings.KeySecret, $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}");
        if (!FixedTimeEquals(expectedSignature, request.RazorpaySignature))
        {
            payment.Status = "Failed";
            await _db.SaveChangesAsync();
            return ServiceResult<EmployerVerifyPaymentResponse>.Fail("SignatureMismatch", "Payment verification failed.");
        }

        payment.Status = "Paid";
        payment.PaidAt = DateTime.UtcNow;
        payment.RazorpayPaymentId = request.RazorpayPaymentId;
        payment.RazorpaySignature = request.RazorpaySignature;

        var plan = payment.Plan;

        var credits = await _db.EmployerCredits.FirstOrDefaultAsync(c => c.EmployerProfileId == employerProfileId);
        if (credits is null)
        {
            credits = new EmployerCredits { EmployerProfileId = employerProfileId, CreatedDate = DateTime.UtcNow };
            _db.EmployerCredits.Add(credits);
        }

        if (plan.IsTopUp)
        {
            credits.TotalCredits += plan.IncludedCredits;
            if (plan.IsUnlimitedCredits) credits.IsUnlimited = true;
            credits.LowCreditNotifiedAt = null;
            credits.UpdatedDate = DateTime.UtcNow;

            _db.CreditTransactions.Add(new CreditTransaction
            {
                EmployerProfileId = employerProfileId,
                Type = "top_up_purchase",
                Amount = plan.IncludedCredits,
                BalanceAfter = credits.CreditsRemaining,
                ReferenceId = payment.Id,
                CreatedDate = DateTime.UtcNow,
            });
        }
        else
        {
            var priorActive = await _db.EmployerSubscriptions
                .Where(s => s.EmployerProfileId == employerProfileId && s.Status == "active")
                .ToListAsync();
            foreach (var old in priorActive) old.Status = "cancelled";

            _db.EmployerSubscriptions.Add(new EmployerSubscription
            {
                EmployerProfileId = employerProfileId,
                PlanId = plan.Id,
                Status = "active",
                PlanName = plan.Name,
                Amount = plan.Price,
                BillingCycle = plan.DurationDays >= 365 ? "yearly" : "monthly",
                MaxActiveJobs = plan.MaxActiveJobs,
                MaxFeaturedJobs = plan.MaxFeaturedJobs,
                CanAccessResumes = plan.CanAccessResumes,
                ResumeViewsPerMonth = plan.ResumeViewsPerMonth,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(plan.DurationDays),
                AutoRenew = false,
                PaymentMethod = "Razorpay",
                RazorpayOrderId = payment.RazorpayOrderId,
                RazorpayPaymentId = payment.RazorpayPaymentId,
                PaymentStatus = "Paid",
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
            });

            credits.TotalCredits += plan.IncludedCredits;
            if (plan.IsUnlimitedCredits) credits.IsUnlimited = true;
            credits.LowCreditNotifiedAt = null;
            credits.UpdatedDate = DateTime.UtcNow;

            _db.CreditTransactions.Add(new CreditTransaction
            {
                EmployerProfileId = employerProfileId,
                Type = "plan_grant",
                Amount = plan.IncludedCredits,
                BalanceAfter = credits.CreditsRemaining,
                ReferenceId = payment.Id,
                CreatedDate = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();

        var employer = await _db.EmployerProfiles.AsNoTracking().Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == employerProfileId);
        await _audit.LogAsync(new AuditEntry
        {
            EventType = plan.IsTopUp ? AuditEventTypes.WalletTopUp : AuditEventTypes.SubscriptionPurchased,
            Category = AuditEventTypes.Categories.Billing,
            Summary = plan.IsTopUp
                ? $"Employer credit top-up: {plan.Name} (₹{plan.Price:0.##}) by {employer?.CompanyName ?? "—"}"
                : $"Employer subscription purchased: {plan.Name} (₹{plan.Price:0.##}) by {employer?.CompanyName ?? "—"}",
            ActorUserId = employer?.UserId,
            ActorEmail = employer?.User?.Email ?? employer?.ContactEmail,
            ActorRole = "employer",
            TargetType = "EmployerPayment",
            TargetId = payment.Id.ToString(),
            Metadata = new { planId = plan.Id, planName = plan.Name, amount = plan.Price, isTopUp = plan.IsTopUp, employerProfileId },
        });

        return ServiceResult<EmployerVerifyPaymentResponse>.Ok(new EmployerVerifyPaymentResponse
        {
            Paid = true,
            IsTopUp = plan.IsTopUp,
            PlanName = plan.Name,
            CreditsGranted = plan.IncludedCredits,
        });
    }

    public async Task<AcknowledgmentStatusDto> GetAcknowledgmentStatusAsync(int employerProfileId)
    {
        var latest = await _db.EmployerAcknowledgments.AsNoTracking()
            .Where(a => a.EmployerProfileId == employerProfileId)
            .OrderByDescending(a => a.AcceptedAt)
            .FirstOrDefaultAsync();

        return new AcknowledgmentStatusDto
        {
            HasAcknowledgedLatest = latest is not null && latest.PlanVersion == EmployerTermsVersion.Current,
            PlanVersion = latest?.PlanVersion,
            AcceptedAt = latest?.AcceptedAt,
            CurrentPlanVersion = EmployerTermsVersion.Current,
        };
    }

    public async Task<ServiceResult> AcknowledgeTermsAsync(int employerProfileId, AcknowledgeTermsRequest request, string? ipAddress)
    {
        _db.EmployerAcknowledgments.Add(new EmployerAcknowledgment
        {
            EmployerProfileId = employerProfileId,
            PlanVersion = EmployerTermsVersion.Current,
            AcceptedAt = DateTime.UtcNow,
            IpAddress = ipAddress,
        });
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    /// <summary>Static/db-parameterized like TestService.HasAccessAsync, so the hourly BackgroundService
    /// (in the JobPortal.Api assembly) can call it against a fresh scoped AppDbContext without needing
    /// a full service instance — public rather than internal since, unlike HasAccessAsync, this is
    /// called across the Infrastructure/Api assembly boundary.</summary>
    public static async Task RunNotificationSweepAsync(AppDbContext db, IEmailSender emailSender, ILogger logger)
    {
        var today = DateTime.UtcNow.Date;

        var expiring = await db.EmployerSubscriptions.Include(s => s.EmployerProfile)
            .Where(s => s.Status == "active")
            .ToListAsync();

        foreach (var sub in expiring)
        {
            if (sub.EndDate.Date < today)
            {
                sub.Status = "expired";
                sub.IsActive = false;
                continue;
            }

            var daysToExpiry = (sub.EndDate.Date - today).Days;
            var contactEmail = sub.EmployerProfile.ContactEmail;
            if (string.IsNullOrWhiteSpace(contactEmail)) continue;

            if (daysToExpiry == 7 && sub.Notified7DayAt is null)
            {
                await SafeSendAsync(emailSender, logger, contactEmail, "Your JobCharcha employer plan expires in 7 days",
                    $"Your \"{sub.PlanName}\" plan expires on {sub.EndDate:d MMM yyyy}. Renew from your employer dashboard to avoid interruption.");
                sub.Notified7DayAt = DateTime.UtcNow;
            }
            else if (daysToExpiry <= 1 && sub.Notified1DayAt is null)
            {
                await SafeSendAsync(emailSender, logger, contactEmail, "Your JobCharcha employer plan expires tomorrow",
                    $"Your \"{sub.PlanName}\" plan expires on {sub.EndDate:d MMM yyyy}. Renew now from your employer dashboard.");
                sub.Notified1DayAt = DateTime.UtcNow;
            }
        }

        var lowCreditCandidates = await db.EmployerCredits.Include(c => c.EmployerProfile)
            .Where(c => !c.IsUnlimited && c.TotalCredits > 0 && c.LowCreditNotifiedAt == null)
            .ToListAsync();

        foreach (var credits in lowCreditCandidates)
        {
            var remainingRatio = (double)credits.CreditsRemaining / credits.TotalCredits;
            if (remainingRatio >= 0.10) continue;

            var contactEmail = credits.EmployerProfile.ContactEmail;
            if (string.IsNullOrWhiteSpace(contactEmail)) continue;

            await SafeSendAsync(emailSender, logger, contactEmail, "Your JobCharcha contact credits are running low",
                $"You have {credits.CreditsRemaining} of {credits.TotalCredits} contact credits left. Buy more from your employer dashboard to keep contacting candidates.");
            credits.LowCreditNotifiedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
    }

    private static async Task SafeSendAsync(IEmailSender emailSender, ILogger logger, string toEmail, string subject, string body)
    {
        try
        {
            await emailSender.SendAsync(toEmail, subject, body);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Employer notification email failed for {Email}", toEmail);
        }
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
}
