using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class CutOffRecord
{
    [Key]
    public int Id { get; set; }

    public string ExamName { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string OrganizationName { get; set; } = null!;

    public int Year { get; set; }

    public string PostName { get; set; } = null!;

    public string? Series { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? GeneralCutOff { get; set; }

    [Column("SCCutOff", TypeName = "decimal(5, 2)")]
    public decimal? SccutOff { get; set; }

    [Column("STCutOff", TypeName = "decimal(5, 2)")]
    public decimal? StcutOff { get; set; }

    [Column("OBCCutOff", TypeName = "decimal(5, 2)")]
    public decimal? ObccutOff { get; set; }

    [Column("EWSCutOff", TypeName = "decimal(5, 2)")]
    public decimal? EwscutOff { get; set; }

    [Column("PwDCutOff", TypeName = "decimal(5, 2)")]
    public decimal? PwDcutOff { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? ExServicemanCutOff { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? WomenCutOff { get; set; }

    public int? TotalPosts { get; set; }

    public int? TotalCandidatesAppeared { get; set; }

    public string? Source { get; set; }

    public bool IsVerified { get; set; }

    public DateTime CreatedAt { get; set; }
}
