using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests.TestSupport;

/// <summary>
/// SQL Server auto-generates a fresh ROWVERSION on every insert/update of a [Timestamp] column;
/// that server-side generation is what makes EmployerCredits.RowVersion actually catch concurrent
/// writers in production. The InMemory provider has no equivalent behavior for byte[] columns —
/// the bytes we seed just sit there unchanged across saves, so a plain AppDbContext can never
/// reproduce the DbUpdateConcurrencyException the retry loop in EmployerContactService exists to
/// handle. This subclass, used only by the concurrency test, bumps RowVersion on every modified
/// EmployerCredits row right before the save actually hits the store — standing in for what the
/// real database would do — so the race can actually be exercised.
/// </summary>
public class ConcurrencyTestDbContext : AppDbContext
{
    public ConcurrencyTestDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        BumpRowVersions();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        BumpRowVersions();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void BumpRowVersions()
    {
        foreach (var entry in ChangeTracker.Entries<EmployerCredits>())
        {
            if (entry.State is EntityState.Modified or EntityState.Added)
                entry.Property(e => e.RowVersion).CurrentValue = Guid.NewGuid().ToByteArray()[..8];
        }
    }
}
