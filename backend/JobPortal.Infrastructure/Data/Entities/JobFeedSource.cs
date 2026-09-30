using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("DefaultCategoryId", Name = "IX_JobFeedSources_DefaultCategoryId")]
[Index("IsActive", Name = "IX_JobFeedSources_IsActive")]
public partial class JobFeedSource
{
    [Key]
    public int Id { get; set; }

    [StringLength(150)]
    public string Name { get; set; } = null!;

    [StringLength(150)]
    public string? OrganizationHint { get; set; }

    public int SourceType { get; set; }

    [StringLength(1000)]
    public string Url { get; set; } = null!;

    public int? DefaultCategoryId { get; set; }

    [StringLength(100)]
    public string? StateHint { get; set; }

    public DateTime? LastFetchedAt { get; set; }

    public int LastFetchNewCount { get; set; }

    public int LastFetchSkippedReviewedCount { get; set; }

    public int LastFetchSkippedPendingCount { get; set; }

    [StringLength(500)]
    public string? LastError { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("DefaultCategoryId")]
    [InverseProperty("JobFeedSources")]
    public virtual Category? DefaultCategory { get; set; }

    [InverseProperty("FeedSource")]
    public virtual ICollection<JobDraftQueue> JobDraftQueues { get; set; } = new List<JobDraftQueue>();
}
