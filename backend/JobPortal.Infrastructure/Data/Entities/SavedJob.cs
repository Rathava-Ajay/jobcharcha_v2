using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>An aspirant's bookmarked private/employer job. Govt jobs are out of scope (they apply externally).</summary>
[Table("SavedJobs")]
[Index(nameof(UserId), nameof(EmployerJobId), Name = "IX_SavedJobs_UserId_EmployerJobId", IsUnique = true)]
public partial class SavedJob
{
    [Key]
    public Guid Id { get; set; }

    [StringLength(450)]
    public string UserId { get; set; } = null!;

    public int EmployerJobId { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual AspNetUser User { get; set; } = null!;

    [ForeignKey(nameof(EmployerJobId))]
    public virtual EmployerJob EmployerJob { get; set; } = null!;
}
