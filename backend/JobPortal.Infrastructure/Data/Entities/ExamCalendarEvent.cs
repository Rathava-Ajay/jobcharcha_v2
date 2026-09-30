using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_ExamCalendarEvents_CategoryId")]
[Index("EventDate", Name = "IX_ExamCalendarEvents_EventDate")]
[Index("EventType", "IsActive", Name = "IX_ExamCalendarEvents_EventType_IsActive")]
public partial class ExamCalendarEvent
{
    [Key]
    public int Id { get; set; }

    [StringLength(300)]
    public string Title { get; set; } = null!;

    [StringLength(300)]
    public string? TitleGujarati { get; set; }

    [StringLength(150)]
    public string? ExamName { get; set; }

    [StringLength(150)]
    public string? Organization { get; set; }

    [StringLength(40)]
    public string EventType { get; set; } = null!;

    public DateTime EventDate { get; set; }

    public DateTime? EndDate { get; set; }

    [StringLength(500)]
    public string? SourceUrl { get; set; }

    [StringLength(500)]
    public string? RelatedSlug { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public int? CategoryId { get; set; }

    public bool IsFeatured { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("ExamCalendarEvents")]
    public virtual Category? Category { get; set; }
}
