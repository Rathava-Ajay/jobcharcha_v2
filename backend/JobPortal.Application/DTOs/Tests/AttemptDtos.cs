namespace JobPortal.Application.DTOs.Tests;

public class AttemptQuestionDto
{
    public int Id { get; set; }
    public int DisplayOrder { get; set; }
    public string Subject { get; set; } = null!;
    public string? Topic { get; set; }
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;

    // Gujarati equivalents — null when this question has no Gujarati translation.
    public string? QuestionTextGu { get; set; }
    public string? OptionAGu { get; set; }
    public string? OptionBGu { get; set; }
    public string? OptionCGu { get; set; }
    public string? OptionDGu { get; set; }

    public decimal Marks { get; set; }

    // Populated only when resuming an in-progress attempt.
    public string? SelectedOption { get; set; }
    public bool IsMarkedForReview { get; set; }
    public bool IsVisited { get; set; }
}

public class AttemptSectionDto
{
    public string Name { get; set; } = null!;
    public List<AttemptQuestionDto> Questions { get; set; } = new();
}

public class AttemptSessionDto
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = null!;
    public string? TestTitleGu { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime EndsAt { get; set; }
    public int RemainingSeconds { get; set; }
    /// <summary>True when at least one question in this attempt has Gujarati content — lets the
    /// client show/hide the in-test English/ગુજરાતી language toggle.</summary>
    public bool HasGujarati { get; set; }
    public List<AttemptSectionDto> Sections { get; set; } = new();
}

public class SaveResponseRequest
{
    public int QuestionId { get; set; }
    public string? SelectedOption { get; set; }
    public bool IsMarkedForReview { get; set; }
}

public class AttemptResultQuestionDto
{
    public int QuestionId { get; set; }
    public string QuestionText { get; set; } = null!;
    public string OptionA { get; set; } = null!;
    public string OptionB { get; set; } = null!;
    public string OptionC { get; set; } = null!;
    public string OptionD { get; set; } = null!;
    public string? QuestionTextGu { get; set; }
    public string? OptionAGu { get; set; }
    public string? OptionBGu { get; set; }
    public string? OptionCGu { get; set; }
    public string? OptionDGu { get; set; }
    public string CorrectOption { get; set; } = null!;
    public string? SelectedOption { get; set; }
    public string? Explanation { get; set; }
    public string? ExplanationGu { get; set; }
    public decimal Marks { get; set; }
}

public class AttemptResultDto
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = null!;
    public string? TestTitleGu { get; set; }
    public decimal Score { get; set; }
    public decimal MaxScore { get; set; }
    public decimal AccuracyPercent { get; set; }
    public decimal? Percentile { get; set; }
    public int? AllIndiaRank { get; set; }
    /// <summary>True when the caller doesn't have an active premium plan — rank/percentile
    /// are withheld (null above) as a premium perk, matching the plans this test's category unlocks.</summary>
    public bool AnalyticsLocked { get; set; }
    public int TotalAttempts { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public int UnansweredCount { get; set; }
    public int TotalTimeSeconds { get; set; }
    public DateTime SubmittedAt { get; set; }
    public List<AttemptResultQuestionDto> Questions { get; set; } = new();
}

public class AttemptHistoryItemDto
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = null!;
    public string TestSlug { get; set; } = null!;
    public string ExamName { get; set; } = null!;
    public string CategoryName { get; set; } = null!;
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool IsCompleted { get; set; }
    public decimal? Score { get; set; }
    public decimal? MaxScore { get; set; }
    public decimal? AccuracyPercent { get; set; }
}
