namespace JobPortal.Application.Common;

public class BulkImportRowError
{
    /// <summary>1-based, counting header as row 1 (so row 2 is the first data row) — matches
    /// what a spreadsheet's row numbers would show, for the admin to find the offending line.</summary>
    public int RowNumber { get; set; }
    public string Error { get; set; } = null!;
}

public class BulkImportResult
{
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<BulkImportRowError> Errors { get; set; } = new();
}
