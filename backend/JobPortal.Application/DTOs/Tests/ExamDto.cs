namespace JobPortal.Application.DTOs.Tests;

public class ExamDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? NameGujarati { get; set; }
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategorySlug { get; set; }
    public int FreeTestsAllowed { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int TestCount { get; set; }
}

public class UpsertExamRequest
{
    public string Name { get; set; } = null!;
    public string? NameGujarati { get; set; }
    public string? Slug { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public int? CategoryId { get; set; }
    public int FreeTestsAllowed { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
