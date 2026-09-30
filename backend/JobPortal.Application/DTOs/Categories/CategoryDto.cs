using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Categories;

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? NameGujarati { get; set; }
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public string Icon { get; set; } = null!;
    public int DisplayOrder { get; set; }
    public bool ShowOnHomepage { get; set; }
    public int HomepageJobCount { get; set; }
    public bool IsActive { get; set; }
    public int JobCount { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
}

public class UpsertCategoryRequest
{
    [Required(AllowEmptyStrings = false), StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = null!;

    [StringLength(100)] public string? NameGujarati { get; set; }
    [StringLength(120)] public string? Slug { get; set; }
    [StringLength(2000)] public string? Description { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(50)]
    public string Icon { get; set; } = "Briefcase";

    [Range(0, 100000)] public int DisplayOrder { get; set; }
    public bool ShowOnHomepage { get; set; }
    public bool IsActive { get; set; } = true;
    [StringLength(300)] public string? MetaTitle { get; set; }
    [StringLength(500)] public string? MetaDescription { get; set; }
    [StringLength(500)] public string? MetaKeywords { get; set; }
}
