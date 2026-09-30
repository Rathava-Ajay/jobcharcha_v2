using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_ExamMaterials_CategoryId")]
public partial class ExamMaterial
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public int CategoryId { get; set; }

    public string Description { get; set; } = null!;

    public int MaterialType { get; set; }

    public string FilePath { get; set; } = null!;

    public long FileSize { get; set; }

    public int DownloadCount { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("ExamMaterials")]
    public virtual Category Category { get; set; } = null!;
}
