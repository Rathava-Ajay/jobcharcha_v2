using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("JobId", Name = "IX_JobPosts_JobId")]
public partial class JobPost
{
    [Key]
    public int Id { get; set; }

    public int JobId { get; set; }

    [StringLength(200)]
    public string PostName { get; set; } = null!;

    [StringLength(200)]
    public string? PostNameGujarati { get; set; }

    public int Vacancies { get; set; }

    [StringLength(200)]
    public string? Salary { get; set; }

    [StringLength(500)]
    public string? Qualification { get; set; }

    public int? MinAge { get; set; }

    public int? MaxAge { get; set; }

    public string? AdditionalInfo { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("JobPosts")]
    public virtual Job Job { get; set; } = null!;
}
