using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class SuccessStory
{
    [Key]
    public int Id { get; set; }

    public string CandidateName { get; set; } = null!;

    public string? CandidatePhoto { get; set; }

    public string? City { get; set; }

    public string ExamName { get; set; } = null!;

    public string PostSelected { get; set; } = null!;

    public string Organization { get; set; } = null!;

    public int Year { get; set; }

    public string? Testimonial { get; set; }

    public string? Tip { get; set; }

    public bool IsVerified { get; set; }

    public bool IsPublished { get; set; }

    public bool ShowOnHomepage { get; set; }

    public int LikeCount { get; set; }

    public DateTime CreatedAt { get; set; }
}
