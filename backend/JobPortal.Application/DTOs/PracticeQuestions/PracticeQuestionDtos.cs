namespace JobPortal.Application.DTOs.PracticeQuestions;

public class PracticeExamOptionDto
{
    public int ExamId { get; set; }
    public string ExamName { get; set; } = null!;
    public int QuestionCount { get; set; }
}

public class PracticeQuestionDto
{
    public int Id { get; set; }
    public int ExamId { get; set; }
    public string ExamName { get; set; } = null!;
    public string Subject { get; set; } = null!;
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = null!; // Easy | Medium | Hard
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string CorrectOption { get; set; } = null!;
    public string? Explanation { get; set; }
    public decimal Marks { get; set; }
}

public class PracticeQuestionQuery
{
    public int? ExamId { get; set; }
    public string? Subject { get; set; }
    public string? Topic { get; set; }
    public string? Difficulty { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
