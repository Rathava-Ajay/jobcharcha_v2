namespace JobPortal.Application.DTOs.CutOffs;

public class CutOffExamOptionDto
{
    public string Slug { get; set; } = null!;
    public string ExamName { get; set; } = null!;
    public string OrganizationName { get; set; } = null!;
    public int RecordCount { get; set; }
}

public class CutOffCategoryValuesDto
{
    public decimal? General { get; set; }
    public decimal? Sc { get; set; }
    public decimal? St { get; set; }
    public decimal? Obc { get; set; }
    public decimal? Ews { get; set; }
    public decimal? PwD { get; set; }
    public decimal? ExServiceman { get; set; }
    public decimal? Women { get; set; }
}

public class CutOffRecordDto
{
    public int Id { get; set; }
    public string ExamName { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string OrganizationName { get; set; } = null!;
    public int Year { get; set; }
    public string PostName { get; set; } = null!;
    public string? Series { get; set; }
    public CutOffCategoryValuesDto Categories { get; set; } = null!;
    public int? TotalPosts { get; set; }
    public int? TotalCandidatesAppeared { get; set; }
    public bool IsVerified { get; set; }
}

public class CutOffHistoricalPointDto
{
    public int Year { get; set; }
    public decimal CutOff { get; set; }
}

public class CutOffPredictionDto
{
    public string ExamName { get; set; } = null!;
    public string OrganizationName { get; set; } = null!;
    public string PostName { get; set; } = null!;
    public string Category { get; set; } = null!;
    public List<CutOffHistoricalPointDto> HistoricalPoints { get; set; } = new();
    public int PredictedYear { get; set; }
    public decimal PredictedCutOff { get; set; }
    public string Trend { get; set; } = null!; // Rising | Falling | Stable
    public string Confidence { get; set; } = null!; // Low | Medium | High
}
