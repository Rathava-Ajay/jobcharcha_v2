using System.ComponentModel.DataAnnotations;

namespace JobPortal.Application.DTOs.GovtSchemes;

public class GovtSchemeDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string? TitleGujarati { get; set; }
    public string Slug { get; set; } = null!;
    public string Ministry { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string Eligibility { get; set; } = null!;
    public string Benefits { get; set; } = null!;
    public string? Description { get; set; }
    public string ApplyLink { get; set; } = null!;
    public string? OfficialNotificationUrl { get; set; }
    public bool IsFeatured { get; set; }
    public int DisplayOrder { get; set; }
}

public class GovtSchemeListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string Ministry { get; set; } = null!;
    public string Category { get; set; } = null!;
    public string Eligibility { get; set; } = null!;
    public string Benefits { get; set; } = null!;
    public string ApplyLink { get; set; } = null!;
    public bool IsFeatured { get; set; }
}

public class UpsertGovtSchemeRequest
{
    [Required(AllowEmptyStrings = false), StringLength(300, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(300)] public string? TitleGujarati { get; set; }
    [StringLength(300)] public string? Slug { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(200)]
    public string Ministry { get; set; } = null!;

    [Required(AllowEmptyStrings = false), StringLength(100)]
    public string Category { get; set; } = null!;

    [Required(AllowEmptyStrings = false), StringLength(20000)]
    public string Eligibility { get; set; } = null!;

    [Required(AllowEmptyStrings = false), StringLength(20000)]
    public string Benefits { get; set; } = null!;

    [StringLength(60000)] public string? Description { get; set; }

    [Required(AllowEmptyStrings = false), StringLength(500)]
    public string ApplyLink { get; set; } = null!;

    [StringLength(500)] public string? OfficialNotificationUrl { get; set; }

    public bool IsFeatured { get; set; }
    [Range(0, 100000)] public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
