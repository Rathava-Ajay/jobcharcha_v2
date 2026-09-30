using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data;

public partial class AppDbContext
{
    public virtual DbSet<SavedJob> SavedJobs { get; set; } = null!;

    // Invoked from OnModelCreatingPartial (AppDbContext.SiteSettings.cs) — a partial method
    // can only be implemented once, so feature config is chained through helper methods.
    private static void ConfigureSavedJobs(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SavedJob>(entity =>
        {
            entity.ToTable("SavedJobs");
            entity.Property(e => e.Id).ValueGeneratedNever();

            // Cascade from the user so deleting an account cleans up its bookmarks. The
            // job-side FK is NoAction to avoid a multiple-cascade-path to AspNetUsers
            // (SavedJobs -> EmployerJobs -> EmployerProfiles -> AspNetUsers); the read
            // queries already skip rows whose job is gone or inactive.
            entity.HasOne(e => e.User).WithMany()
                .HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.EmployerJob).WithMany()
                .HasForeignKey(e => e.EmployerJobId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
