using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace JobPortal.Infrastructure.Data;

public partial class AppDbContext
{
    // SQL Server datetime/datetime2 columns don't carry timezone info, so EF Core materializes them
    // as DateTimeKind.Unspecified. Every DateTime in this app is written as DateTime.UtcNow (or
    // GETUTCDATE()), so on the way out we re-tag them as Utc — otherwise System.Text.Json omits the
    // "Z" suffix and clients parse the timestamp as local time instead of UTC.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion(typeof(UtcDateTimeConverter));
        configurationBuilder.Properties<DateTime?>().HaveConversion(typeof(UtcNullableDateTimeConverter));
    }

    private class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public UtcDateTimeConverter() : base(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
        {
        }
    }

    private class UtcNullableDateTimeConverter : ValueConverter<DateTime?, DateTime?>
    {
        public UtcNullableDateTimeConverter()
            : base(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v)
        {
        }
    }
}
