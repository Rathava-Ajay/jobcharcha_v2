using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

public class EmployerContactServiceTests
{
    private static EmployerProfile NewEmployerProfile(int id) => new()
    {
        Id = id,
        UserId = $"employer-user-{id}",
        CompanyName = "Acme Corp",
        CompanySlug = $"acme-corp-{id}",
        CompanySize = "11-50",
        City = "Ahmedabad",
        State = "Gujarat",
        ContactName = "Owner",
        ContactEmail = "owner@acme.example",
        ContactPhone = "9999999999",
        CreatedDate = DateTime.UtcNow,
        IsActive = true,
    };

    private static EmployerSubscription NewActiveSubscription(int employerProfileId) => new()
    {
        EmployerProfileId = employerProfileId,
        PlanName = "Growth",
        Amount = 2999m,
        BillingCycle = "monthly",
        MaxActiveJobs = 10,
        MaxFeaturedJobs = 2,
        ResumeViewsPerMonth = 100,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(29),
        AutoRenew = false,
        PaymentMethod = "razorpay",
        PaymentStatus = "Paid",
        Status = "active",
        CreatedDate = DateTime.UtcNow,
        IsActive = true,
    };

    // InMemory still enforces the [Timestamp] RowVersion column as a required, provider-generated
    // value — real SQL Server fills it in automatically, but seeding directly means supplying one.
    private static EmployerCredits NewEmployerCredits(int employerProfileId, int totalCredits, bool isUnlimited = false) => new()
    {
        EmployerProfileId = employerProfileId,
        TotalCredits = totalCredits,
        UsedCredits = 0,
        IsUnlimited = isUnlimited,
        RowVersion = Guid.NewGuid().ToByteArray()[..8],
        CreatedDate = DateTime.UtcNow,
    };

    private static async Task SeedBaseAsync(AppDbContext db, int employerProfileId, int totalCredits, bool isUnlimited = false, bool activeSubscription = true)
    {
        db.EmployerProfiles.Add(NewEmployerProfile(employerProfileId));
        if (activeSubscription) db.EmployerSubscriptions.Add(NewActiveSubscription(employerProfileId));
        db.EmployerCredits.Add(NewEmployerCredits(employerProfileId, totalCredits, isUnlimited));
        db.AspNetUsers.Add(new AspNetUser { Id = "candidate-a", FirstName = "Cand", LastName = "A", CreatedDate = DateTime.UtcNow });
        db.AspNetUsers.Add(new AspNetUser { Id = "candidate-b", FirstName = "Cand", LastName = "B", CreatedDate = DateTime.UtcNow });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task AttemptContactAsync_WithCreditsAndActiveSubscription_DeductsOneCredit()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        await SeedBaseAsync(db, employerProfileId: 1, totalCredits: 5);
        var service = new EmployerContactService(db, new FakeBackgroundTaskQueue());

        var result = await service.AttemptContactAsync(1, "candidate-a", "Hi, interested in your profile.");

        Assert.True(result.Allowed);
        Assert.Equal("success", result.Reason);
        Assert.Equal(4, result.CreditsRemaining);

        var credits = await db.EmployerCredits.AsNoTracking().FirstAsync(c => c.EmployerProfileId == 1);
        Assert.Equal(1, credits.UsedCredits);
        var transaction = await db.CreditTransactions.AsNoTracking().SingleAsync();
        Assert.Equal(-1, transaction.Amount);
    }

    [Fact]
    public async Task AttemptContactAsync_UnlimitedPlan_DoesNotDecrementCredits()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        await SeedBaseAsync(db, employerProfileId: 1, totalCredits: 0, isUnlimited: true);
        var service = new EmployerContactService(db, new FakeBackgroundTaskQueue());

        var result = await service.AttemptContactAsync(1, "candidate-a", null);

        Assert.True(result.Allowed);
        Assert.True(result.IsUnlimited);
        var credits = await db.EmployerCredits.AsNoTracking().FirstAsync(c => c.EmployerProfileId == 1);
        Assert.Equal(0, credits.UsedCredits);
    }

    [Fact]
    public async Task AttemptContactAsync_NoCreditsRemaining_ReturnsBlockedNoCredits()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        await SeedBaseAsync(db, employerProfileId: 1, totalCredits: 0);
        var service = new EmployerContactService(db, new FakeBackgroundTaskQueue());

        var result = await service.AttemptContactAsync(1, "candidate-a", null);

        Assert.False(result.Allowed);
        Assert.Equal("blocked_no_credits", result.Reason);
    }

    [Fact]
    public async Task AttemptContactAsync_ExpiredSubscription_ReturnsBlockedExpired()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.EmployerProfiles.Add(NewEmployerProfile(1));
        var expired = NewActiveSubscription(1);
        expired.Status = "active";
        expired.EndDate = DateTime.UtcNow.AddDays(-1); // lapsed
        db.EmployerSubscriptions.Add(expired);
        db.EmployerCredits.Add(NewEmployerCredits(1, totalCredits: 5));
        db.AspNetUsers.Add(new AspNetUser { Id = "candidate-a", FirstName = "Cand", LastName = "A", CreatedDate = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var service = new EmployerContactService(db, new FakeBackgroundTaskQueue());

        var result = await service.AttemptContactAsync(1, "candidate-a", null);

        Assert.False(result.Allowed);
        Assert.Equal("blocked_expired", result.Reason);
        var credits = await db.EmployerCredits.AsNoTracking().FirstAsync(c => c.EmployerProfileId == 1);
        Assert.Equal(0, credits.UsedCredits); // never touched
    }

    [Fact]
    public async Task AttemptContactAsync_AlreadyContacted_ReturnsAlreadyUnlockedWithoutDeductingAgain()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        await SeedBaseAsync(db, employerProfileId: 1, totalCredits: 5);
        var service = new EmployerContactService(db, new FakeBackgroundTaskQueue());

        var first = await service.AttemptContactAsync(1, "candidate-a", null);
        var second = await service.AttemptContactAsync(1, "candidate-a", null);

        Assert.Equal("success", first.Reason);
        Assert.Equal("already_unlocked", second.Reason);
        var credits = await db.EmployerCredits.AsNoTracking().FirstAsync(c => c.EmployerProfileId == 1);
        Assert.Equal(1, credits.UsedCredits); // only the first attempt deducted
    }

    /// <summary>
    /// Reproduces the race the RowVersion/DbUpdateConcurrencyException retry loop exists to guard
    /// against: two overlapping requests both read "1 credit left" before either writes back. Context
    /// A is deliberately primed (query executed, entity tracked) BEFORE context B commits, so when A's
    /// SaveChanges later fires it carries a stale RowVersion and must hit the catch-and-retry branch —
    /// this is what actually exercises that code path, not just the end-state math.
    /// </summary>
    [Fact]
    public async Task AttemptContactAsync_ConcurrentOverlappingRequests_OnlyOneDeductsTheLastCredit()
    {
        var dbName = TestDb.NewDbName();
        var seedDb = TestDb.CreateWithRowVersionGeneration(dbName);
        await SeedBaseAsync(seedDb, employerProfileId: 1, totalCredits: 1);

        var dbA = TestDb.CreateWithRowVersionGeneration(dbName);
        var dbB = TestDb.CreateWithRowVersionGeneration(dbName);

        // Prime context A's change tracker with the pre-race EmployerCredits row (stale RowVersion
        // once B commits below) — mirrors a request that started reading just before another finished writing.
        await dbA.EmployerCredits.FirstAsync(c => c.EmployerProfileId == 1);

        var serviceB = new EmployerContactService(dbB, new FakeBackgroundTaskQueue());
        var resultB = await serviceB.AttemptContactAsync(1, "candidate-b", null);

        var serviceA = new EmployerContactService(dbA, new FakeBackgroundTaskQueue());
        var resultA = await serviceA.AttemptContactAsync(1, "candidate-a", null);

        var outcomes = new[] { resultA.Reason, resultB.Reason };
        Assert.Contains("success", outcomes);
        Assert.Contains("blocked_no_credits", outcomes);

        // This is the guarantee the RowVersion/retry loop exists for: exactly one credit gets
        // spent no matter how the two requests interleave, never zero and never two.
        var finalCredits = await seedDb.EmployerCredits.AsNoTracking().FirstAsync(c => c.EmployerProfileId == 1);
        Assert.Equal(1, finalCredits.UsedCredits);
        Assert.Equal(0, finalCredits.CreditsRemaining);
    }

    /// <summary>
    /// Generalizes the two-way test above to genuine N-way parallelism: N unlock requests, each on
    /// its own DbContext/service instance (DbContext isn't thread-safe, so a real concurrent request
    /// can never share one) and each dispatched via Task.Run so they actually race on the thread
    /// pool rather than just interleaving cooperatively under Task.WhenAll. Balance covers strictly
    /// fewer than N unlocks, so this only proves something if the race is real: floor(balance/cost)
    /// requests must win, the rest must be cleanly rejected, and the balance must never go negative
    /// regardless of interleaving. Cost is fixed at 1 credit/unlock in this domain (no configurable
    /// cost parameter exists on EmployerContactService).
    /// </summary>
    [Theory]
    [InlineData(5, 20)]
    [InlineData(1, 12)]
    [InlineData(7, 8)]
    public async Task AttemptContactAsync_NParallelRequests_NeverGoesNegative_ExactlySuccessCountEqualsFloorBalanceOverCost(int totalCredits, int n)
    {
        var dbName = TestDb.NewDbName();
        var seedDb = TestDb.CreateWithRowVersionGeneration(dbName);
        seedDb.EmployerProfiles.Add(NewEmployerProfile(1));
        seedDb.EmployerSubscriptions.Add(NewActiveSubscription(1));
        seedDb.EmployerCredits.Add(NewEmployerCredits(1, totalCredits));
        for (var i = 0; i < n; i++)
        {
            seedDb.AspNetUsers.Add(new AspNetUser { Id = $"candidate-{i}", FirstName = "Cand", LastName = $"{i}", CreatedDate = DateTime.UtcNow });
        }
        await seedDb.SaveChangesAsync();

        const int cost = 1;
        var expectedSuccesses = totalCredits / cost; // floor(balance / cost); C# int division already floors

        var tasks = Enumerable.Range(0, n).Select(i => Task.Run(async () =>
        {
            var db = TestDb.CreateWithRowVersionGeneration(dbName);
            var service = new EmployerContactService(db, new FakeBackgroundTaskQueue());
            return await service.AttemptContactAsync(1, $"candidate-{i}", null);
        })).ToArray();

        var results = await Task.WhenAll(tasks);

        var successCount = results.Count(r => r.Reason == "success");
        Assert.Equal(expectedSuccesses, successCount);
        Assert.All(results.Where(r => r.Reason != "success"), r => Assert.Equal("blocked_no_credits", r.Reason));

        var finalCredits = await seedDb.EmployerCredits.AsNoTracking().FirstAsync(c => c.EmployerProfileId == 1);
        Assert.True(finalCredits.CreditsRemaining >= 0, $"Balance went negative: {finalCredits.CreditsRemaining}");
        Assert.Equal(expectedSuccesses, finalCredits.UsedCredits);

        // The per-candidate ledger must agree with the aggregate: exactly one "success" contact log
        // per winning candidate, none for the losers.
        var successLogs = await seedDb.EmployerContactLogs.AsNoTracking()
            .CountAsync(l => l.EmployerProfileId == 1 && l.Status == "success");
        Assert.Equal(expectedSuccesses, successLogs);
    }
}
