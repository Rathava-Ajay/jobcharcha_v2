using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("CreatedById", Name = "IX_Categories_CreatedById")]
[Index("Slug", Name = "IX_Categories_Slug", IsUnique = true)]
[Index("UpdatedById", Name = "IX_Categories_UpdatedById")]
public partial class Category
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(100)]
    public string? NameGujarati { get; set; }

    [StringLength(150)]
    public string Slug { get; set; } = null!;

    [StringLength(500)]
    public string? Description { get; set; }

    [StringLength(100)]
    public string Icon { get; set; } = null!;

    public int DisplayOrder { get; set; }

    public bool ShowOnHomepage { get; set; }

    public int HomepageJobCount { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    public string? CreatedById { get; set; }

    [StringLength(500)]
    public string? MetaDescription { get; set; }

    [StringLength(500)]
    public string? MetaKeywords { get; set; }

    [StringLength(200)]
    public string? MetaTitle { get; set; }

    public string? UpdatedById { get; set; }

    [InverseProperty("Category")]
    public virtual ICollection<AdmitCard> AdmitCards { get; set; } = new List<AdmitCard>();

    [InverseProperty("Category")]
    public virtual ICollection<AnswerKey> AnswerKeys { get; set; } = new List<AnswerKey>();

    [InverseProperty("Category")]
    public virtual ICollection<Blog> Blogs { get; set; } = new List<Blog>();

    [ForeignKey("CreatedById")]
    [InverseProperty("CategoryCreatedBies")]
    public virtual AspNetUser? CreatedBy { get; set; }

    [InverseProperty("Category")]
    public virtual ICollection<ExamCalendarEvent> ExamCalendarEvents { get; set; } = new List<ExamCalendarEvent>();

    [InverseProperty("Category")]
    public virtual ICollection<ExamMaterial> ExamMaterials { get; set; } = new List<ExamMaterial>();

    [InverseProperty("Category")]
    public virtual ICollection<ExamNotification> ExamNotifications { get; set; } = new List<ExamNotification>();

    [InverseProperty("Category")]
    public virtual ICollection<Exam> Exams { get; set; } = new List<Exam>();

    [InverseProperty("SuggestedCategory")]
    public virtual ICollection<JobDraftQueue> JobDraftQueues { get; set; } = new List<JobDraftQueue>();

    [InverseProperty("DefaultCategory")]
    public virtual ICollection<JobFeedSource> JobFeedSources { get; set; } = new List<JobFeedSource>();

    [InverseProperty("Category")]
    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();

    [InverseProperty("Category")]
    public virtual ICollection<News> News { get; set; } = new List<News>();

    [InverseProperty("Category")]
    public virtual ICollection<OldPaper> OldPapers { get; set; } = new List<OldPaper>();

    [InverseProperty("Category")]
    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();

    [InverseProperty("Category")]
    public virtual ICollection<Result> Results { get; set; } = new List<Result>();

    [InverseProperty("Category")]
    public virtual ICollection<Syllabuse> Syllabuses { get; set; } = new List<Syllabuse>();

    [ForeignKey("UpdatedById")]
    [InverseProperty("CategoryUpdatedBies")]
    public virtual AspNetUser? UpdatedBy { get; set; }
}
