using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("TestId", "DisplayOrder", Name = "IX_TestSections_TestId_DisplayOrder")]
public partial class TestSection
{
    [Key]
    public int Id { get; set; }

    public int TestId { get; set; }

    [StringLength(150)]
    public string Name { get; set; } = null!;

    [StringLength(150)]
    public string? NameGujarati { get; set; }

    public int DisplayOrder { get; set; }

    public int? QuestionCount { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [InverseProperty("Section")]
    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();

    [ForeignKey("TestId")]
    [InverseProperty("TestSections")]
    public virtual Test Test { get; set; } = null!;
}
