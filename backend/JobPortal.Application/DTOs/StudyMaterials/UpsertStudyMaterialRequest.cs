using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.StudyMaterials;

public class UpsertStudyMaterialRequest
{
    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? Slug { get; set; }
    [Range(1, int.MaxValue, ErrorMessage = "A valid category is required.")]
    public int CategoryId { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(20000)]
    public string Description { get; set; } = null!;

    [Required(AllowEmptyStrings = false), StringLength(30)]
    public string MaterialType { get; set; } = "Notes";

    [Required(AllowEmptyStrings = false), StringLength(500)]
    public string FilePath { get; set; } = null!;

    [Range(0, long.MaxValue)] public long FileSize { get; set; }
    public bool IsActive { get; set; } = true;
}
