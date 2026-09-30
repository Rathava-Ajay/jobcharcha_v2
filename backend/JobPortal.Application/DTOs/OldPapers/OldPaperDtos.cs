using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.OldPapers;

public class OldPaperListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string ExamName { get; set; } = null!;
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public int Year { get; set; }
    public string? Subject { get; set; }
    public string? PaperType { get; set; }
    public int Downloads { get; set; }
    public bool IsFeatured { get; set; }
}

public class OldPaperDetailDto : OldPaperListItemDto
{
    public string? Description { get; set; }
    public string PaperPdfLink { get; set; } = null!;
    public string? SolutionPdfLink { get; set; }
    public int? TotalQuestions { get; set; }
    public int? TotalMarks { get; set; }
    public int? Duration { get; set; }
    public bool IsActive { get; set; }
}

public class UpsertOldPaperRequest
{
    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? TitleGujarati { get; set; }
    [StringLength(300)] public string? Slug { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(200)]
    public string ExamName { get; set; } = null!;

    [Range(1, int.MaxValue)] public int? CategoryId { get; set; }
    [Range(1950, 2100)] public int Year { get; set; }
    [StringLength(20000)] public string? Description { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(500)]
    public string PaperPdfLink { get; set; } = null!;

    [StringLength(500)] public string? SolutionPdfLink { get; set; }
    [Range(0, 100000)] public int? TotalQuestions { get; set; }
    [Range(0, 100000)] public int? TotalMarks { get; set; }
    [Range(0, 100000)] public int? Duration { get; set; }
    [StringLength(200)] public string? Subject { get; set; }
    [StringLength(100)] public string? PaperType { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
}
