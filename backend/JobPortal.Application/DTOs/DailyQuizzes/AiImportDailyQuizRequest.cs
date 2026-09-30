namespace JobPortal.Application.DTOs.DailyQuizzes;

public class AiImportDailyQuizQuestionRequest
{
    public string? Topic { get; set; }
    public string QuestionTextEn { get; set; } = null!;
    public string OptionAEn { get; set; } = null!;
    public string OptionBEn { get; set; } = null!;
    public string OptionCEn { get; set; } = null!;
    public string OptionDEn { get; set; } = null!;
    public string CorrectOption { get; set; } = null!;
    public string? ExplanationEn { get; set; }
    public int DisplayOrder { get; set; }
}

public class AiImportDailyQuizRequest
{
    public string QuizDate { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public bool AutoPublish { get; set; } = true;
    public List<AiImportDailyQuizQuestionRequest> Questions { get; set; } = new();
}
