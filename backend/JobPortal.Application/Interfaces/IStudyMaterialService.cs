using JobPortal.Application.Common;
using JobPortal.Application.DTOs.StudyMaterials;

namespace JobPortal.Application.Interfaces;

public interface IStudyMaterialService
{
    Task<List<StudyMaterialDto>> SearchAsync(int? categoryId, string? materialType, string? search);
    Task<string?> RegisterDownloadAsync(string slug);
    Task<List<StudyMaterialDto>> GetAllForAdminAsync();
    Task<ServiceResult<StudyMaterialDto>> CreateAsync(UpsertStudyMaterialRequest request);
    Task<ServiceResult<StudyMaterialDto>> UpdateAsync(int id, UpsertStudyMaterialRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
