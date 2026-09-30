using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Tests;

public class TestListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public int ExamId { get; set; }
    public string ExamName { get; set; } = null!;
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public int DurationMinutes { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalMarks { get; set; }
    public bool IsFree { get; set; }
    public decimal? Price { get; set; }
    public int AttemptsCount { get; set; }
}

public class TestSectionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public int QuestionCount { get; set; }
    public int DisplayOrder { get; set; }
}

public class TestDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public int ExamId { get; set; }
    public string ExamName { get; set; } = null!;
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public int DurationMinutes { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalMarks { get; set; }
    public decimal NegativeMarking { get; set; }
    public decimal MarksPerQuestion { get; set; }
    public bool IsFree { get; set; }
    public decimal? Price { get; set; }
    public string? Instructions { get; set; }
    public string? TitleGu { get; set; }
    public string? InstructionsGu { get; set; }
    public List<TestSectionDto> Sections { get; set; } = new();
    public bool IsLocked { get; set; }
    public bool HasInProgressAttempt { get; set; }
}

public class UpsertQuestionRequest
{
    [Required(AllowEmptyStrings = false), StringLength(150)] public string Subject { get; set; } = null!;
    [StringLength(150)] public string? Topic { get; set; }
    [Required(AllowEmptyStrings = false), StringLength(8000)] public string QuestionTextEn { get; set; } = null!;
    [Required(AllowEmptyStrings = false), StringLength(4000)] public string OptionAEn { get; set; } = null!;
    [Required(AllowEmptyStrings = false), StringLength(4000)] public string OptionBEn { get; set; } = null!;
    [Required(AllowEmptyStrings = false), StringLength(4000)] public string OptionCEn { get; set; } = null!;
    [Required(AllowEmptyStrings = false), StringLength(4000)] public string OptionDEn { get; set; } = null!;
    [Required, RegularExpression("^[A-Da-d]$", ErrorMessage = "correctOption must be A, B, C or D.")]
    public string CorrectOption { get; set; } = null!;
    [StringLength(8000)] public string? ExplanationEn { get; set; }
    [Range(0, 100)] public decimal Marks { get; set; } = 1;
    [Range(0, 100000)] public int DisplayOrder { get; set; }
}

public class UpsertTestSectionRequest
{
    [Required(AllowEmptyStrings = false), StringLength(150)] public string Name { get; set; } = null!;
    [Range(0, 100000)] public int DisplayOrder { get; set; }
    [MaxLength(500)] public List<UpsertQuestionRequest> Questions { get; set; } = new();
}

public class UpsertTestRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "A valid exam is required.")] public int ExamId { get; set; }
    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)] public string Title { get; set; } = null!;
    [StringLength(300)] public string? Slug { get; set; }
    [Range(1, 1440)] public int DurationMinutes { get; set; }
    [Range(0, 100)] public decimal NegativeMarking { get; set; }
    [Range(0, 100)] public decimal MarksPerQuestion { get; set; } = 1;
    public bool IsFree { get; set; }
    [Range(0, 1_000_000)] public decimal? Price { get; set; }
    [StringLength(20000)] public string? Instructions { get; set; }
    [Range(0, 100000)] public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    [MinLength(1, ErrorMessage = "A test needs at least one section."), MaxLength(50)]
    public List<UpsertTestSectionRequest> Sections { get; set; } = new();
}

public class TestAdminListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public int ExamId { get; set; }
    public string ExamName { get; set; } = null!;
    public bool IsFree { get; set; }
    public decimal? Price { get; set; }
    public int TotalQuestions { get; set; }
    public bool IsActive { get; set; }
}
