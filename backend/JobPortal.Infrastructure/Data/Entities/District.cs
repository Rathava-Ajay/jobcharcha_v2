using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("Slug", Name = "IX_Districts_Slug", IsUnique = true)]
public partial class District
{
    [Key]
    public int Id { get; set; }

    public string NameEnglish { get; set; } = null!;

    public string NameGujarati { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public int DisplayOrder { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }
}
