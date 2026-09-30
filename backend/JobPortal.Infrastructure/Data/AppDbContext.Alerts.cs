using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data;

public partial class AppDbContext
{
    public virtual DbSet<AlertDispatchLog> AlertDispatchLogs { get; set; } = null!;
}
