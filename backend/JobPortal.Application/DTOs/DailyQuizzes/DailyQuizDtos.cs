namespace JobPortal.Application.DTOs.DailyQuizzes;

public class DailyQuizQuestionDto
{
    public int Id { get; set; }
    public int DisplayOrder { get; set; }
    public string? Topic { get; set; }
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
}

public class DailyQuizDto
{
    public int Id { get; set; }
    public string QuizDate { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public List<DailyQuizQuestionDto> Questions { get; set; } = new();
}

public class SubmitDailyQuizAnswer
{
    public int QuestionId { get; set; }
    public string? SelectedOption { get; set; }
}

public class SubmitDailyQuizRequest
{
    public string? GuestKey { get; set; }
    public List<SubmitDailyQuizAnswer> Answers { get; set; } = new();
}

public class DailyQuizResultQuestionDto
{
    public int QuestionId { get; set; }
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string CorrectOption { get; set; } = null!;
    public string? SelectedOption { get; set; }
    public string? Explanation { get; set; }
}

public class DailyQuizResultDto
{
    public int AttemptId { get; set; }
    public int DailyQuizId { get; set; }
    public int CorrectCount { get; set; }
    public int TotalQuestions { get; set; }
    public decimal ScorePercent { get; set; }
    public DateTime CompletedAt { get; set; }
    public List<DailyQuizResultQuestionDto> Questions { get; set; } = new();
}
