using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CategoryId", Name = "IX_ExamNotifications_CategoryId")]
[Index("Slug", Name = "IX_ExamNotifications_Slug", IsUnique = true)]
public partial class ExamNotification
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string Organization { get; set; } = null!;

    public string? ExamName { get; set; }

    public int CategoryId { get; set; }

    public DateTime NotificationDate { get; set; }

    public DateTime ExamDate { get; set; }

    public DateTime LastDate { get; set; }

    public string? EligibilityCriteria { get; set; }

    public string? ApplicationFee { get; set; }

    public string? OfficialWebsite { get; set; }

    public string? NotificationPdf { get; set; }

    public int Views { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    public string? District { get; set; }

    public string State { get; set; } = null!;

    public int Status { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("ExamNotifications")]
    public virtual Category Category { get; set; } = null!;
}
