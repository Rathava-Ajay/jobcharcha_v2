using JobPortal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.InMemory.Infrastructure.Internal;

namespace JobPortal.Tests.TestSupport;

/// <summary>
/// Every test gets its own uniquely-named in-memory database (a fresh Guid), so tests never
/// see each other's data even when run in parallel. Concurrency tests deliberately open a
/// second context against the SAME name to simulate two overlapping requests.
/// </summary>
public static class TestDb
{
    public static AppDbContext Create(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            // InMemory has no real transaction concept; EF escalates that mismatch to an error
            // by default. Real SQL Server (where the app actually runs) supports the
            // Database.BeginTransactionAsync()/CommitAsync() calls in PaymentService/
            // StoreOrderService fine — this only silences the InMemory-specific warning so those
            // methods stay testable without a real DB.
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    /// <summary>Same store as <see cref="Create"/>, but with a RowVersion generator wired up so
    /// concurrency-conflict tests can actually trigger a DbUpdateConcurrencyException. See
    /// <see cref="ConcurrencyTestDbContext"/> for why plain InMemory can't do this on its own.</summary>
    public static AppDbContext CreateWithRowVersionGeneration(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ConcurrencyTestDbContext(options);
    }

    public static string NewDbName() => Guid.NewGuid().ToString();
}
