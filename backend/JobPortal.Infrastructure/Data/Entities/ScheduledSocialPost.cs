using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class ScheduledSocialPost
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string Url { get; set; } = null!;

    public string ImageUrl { get; set; } = null!;

    public int ContentType { get; set; }

    public string TagsJson { get; set; } = null!;

    public DateTime ScheduledAt { get; set; }

    public bool IsPosted { get; set; }

    public DateTime? PostedAt { get; set; }

    public string Platforms { get; set; } = null!;

    public string ResultsJson { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
