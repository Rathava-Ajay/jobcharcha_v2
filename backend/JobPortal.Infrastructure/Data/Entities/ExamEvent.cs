using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class ExamEvent
{
    [Key]
    public int Id { get; set; }

    public string ExamName { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string OrganizationName { get; set; } = null!;

    public string? CategoryName { get; set; }

    public DateTime? NotificationDate { get; set; }

    public DateTime? ApplicationStartDate { get; set; }

    public DateTime? ApplicationEndDate { get; set; }

    public DateTime? FeePaymentEndDate { get; set; }

    public DateTime? AdmitCardDate { get; set; }

    public DateTime? ExamDate { get; set; }

    public DateTime? ResultDate { get; set; }

    public DateTime? InterviewDate { get; set; }

    public DateTime? DocumentVerificationDate { get; set; }

    public string? Description { get; set; }

    public int? TotalPosts { get; set; }

    public string? OfficialWebsite { get; set; }

    public string? NotificationUrl { get; set; }

    public string? ExamCity { get; set; }

    public string ExamLevel { get; set; } = null!;

    public string Status { get; set; } = null!;

    public bool IsActive { get; set; }

    public bool IsFeatured { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    [InverseProperty("ExamEvent")]
    public virtual ICollection<ExamReminder> ExamReminders { get; set; } = new List<ExamReminder>();
}
