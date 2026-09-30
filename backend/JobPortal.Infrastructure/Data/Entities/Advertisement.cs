using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class Advertisement
{
    [Key]
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string AdCode { get; set; } = null!;

    public int Position { get; set; }

    public int DisplayOrder { get; set; }

    public int Impressions { get; set; }

    public int Clicks { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }
}
