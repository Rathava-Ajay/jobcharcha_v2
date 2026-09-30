namespace JobPortal.Application.DTOs.StudyMaterials;

public class StudyMaterialDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string MaterialType { get; set; } = null!; // Notes | EBook | Video | Syllabus
    public string FilePath { get; set; } = null!;
    public string FileSizeDisplay { get; set; } = null!;
    public int DownloadCount { get; set; }
}
