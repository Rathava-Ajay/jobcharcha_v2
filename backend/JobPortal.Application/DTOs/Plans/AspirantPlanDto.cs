using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.Plans;

public class AspirantPlanDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? NameGujarati { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DurationDays { get; set; }
    public bool UnlocksAllTests { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class UpsertAspirantPlanRequest
{
    [Required(AllowEmptyStrings = false), StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = null!;

    [StringLength(150)] public string? NameGujarati { get; set; }
    [StringLength(2000)] public string? Description { get; set; }
    [Range(0, 1_000_000)] public decimal Price { get; set; }
    [Range(1, 3660)] public int DurationDays { get; set; }
    public bool UnlocksAllTests { get; set; }
    [Range(0, 100000)] public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
