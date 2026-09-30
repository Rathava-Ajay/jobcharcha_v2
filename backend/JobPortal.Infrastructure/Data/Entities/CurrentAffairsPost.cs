using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class CurrentAffairsPost
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string Content { get; set; } = null!;

    public string? Summary { get; set; }

    public string? CoverImageUrl { get; set; }

    public string Category { get; set; } = null!;

    public string? Tags { get; set; }

    public DateTime PublishedAt { get; set; }

    public bool IsPublished { get; set; }

    public int ViewCount { get; set; }

    public bool IsPremium { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }
}
