using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("DocumentType", Name = "IX_JobDocuments_DocumentType")]
[Index("JobId", Name = "IX_JobDocuments_JobId")]
public partial class JobDocument
{
    [Key]
    public int Id { get; set; }

    public int JobId { get; set; }

    [StringLength(200)]
    public string DocumentName { get; set; } = null!;

    [StringLength(50)]
    public string DocumentType { get; set; } = null!;

    [StringLength(500)]
    public string FilePath { get; set; } = null!;

    public long FileSize { get; set; }

    public int DownloadCount { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("JobDocuments")]
    public virtual Job Job { get; set; } = null!;
}
