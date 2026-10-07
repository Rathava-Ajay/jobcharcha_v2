using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JobPortal.Infrastructure.Data.Entities;

/// <summary>Count of OpenAI image generations per UTC day, for the daily cost cap.</summary>
[Table("SocialImageUsages")]
public partial class SocialImageUsage
{
    [Key]
    [Column(TypeName = "date")]
    public DateTime Day { get; set; }

    public int Count { get; set; }
}
