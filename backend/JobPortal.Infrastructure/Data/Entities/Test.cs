using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("ExamId", "IsFree", "Status", Name = "IX_Tests_ExamId_IsFree_Status")]
[Index("Slug", Name = "IX_Tests_Slug", IsUnique = true)]
[Index("Type", Name = "IX_Tests_Type")]
public partial class Test
{
    [Key]
    public int Id { get; set; }

    public int ExamId { get; set; }

    [StringLength(300)]
    public string Title { get; set; } = null!;

    [StringLength(300)]
    public string? TitleGujarati { get; set; }

    [StringLength(300)]
    public string Slug { get; set; } = null!;

    public int Type { get; set; }

    public int DurationMinutes { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal NegativeMarking { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal MarksPerQuestion { get; set; }

    public int TotalQuestions { get; set; }

    public int TotalMarks { get; set; }

    public bool IsFree { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal? Price { get; set; }

    public bool ShuffleQuestions { get; set; }

    public bool ShuffleOptions { get; set; }

    public int Status { get; set; }

    public string? Instructions { get; set; }

    public string? InstructionsGujarati { get; set; }

    public int DisplayOrder { get; set; }

    [StringLength(200)]
    public string? MetaTitle { get; set; }

    [StringLength(500)]
    public string? MetaDescription { get; set; }

    [StringLength(450)]
    public string? CreatedById { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    /// <summary>Soft-delete / archive flag. A deleted test is hidden from the public catalogue and
    /// the admin list but its row and all attempt history are kept. Set by <c>TestService.DeleteAsync</c>;
    /// never hard-deleted from the UI.</summary>
    public bool IsDeleted { get; set; }

    [InverseProperty("Test")]
    public virtual ICollection<AspirantPayment> AspirantPayments { get; set; } = new List<AspirantPayment>();

    [InverseProperty("Test")]
    public virtual ICollection<Attempt> Attempts { get; set; } = new List<Attempt>();

    [ForeignKey("ExamId")]
    [InverseProperty("Tests")]
    public virtual Exam Exam { get; set; } = null!;

    [InverseProperty("Test")]
    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();

    [InverseProperty("Test")]
    public virtual ICollection<ResultsAnalytic> ResultsAnalytics { get; set; } = new List<ResultsAnalytic>();

    [InverseProperty("Test")]
    public virtual ICollection<TestPurchase> TestPurchases { get; set; } = new List<TestPurchase>();

    [InverseProperty("Test")]
    public virtual ICollection<TestSection> TestSections { get; set; } = new List<TestSection>();
}
