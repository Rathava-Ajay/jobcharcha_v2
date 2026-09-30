using JobPortal.Application.Common;
using JobPortal.Application.DTOs.AdmitCards;

namespace JobPortal.Application.Interfaces;

public interface IAdmitCardService
{
    Task<List<AdmitCardListItemDto>> GetAllAsync(bool includeInactive = false);
    Task<AdmitCardDto?> GetBySlugAsync(string slug);
    Task<AdmitCardDto?> GetByIdAsync(int id);
    Task<ServiceResult<AdmitCardDto>> CreateAsync(UpsertAdmitCardRequest request, string userId);
    Task<ServiceResult<AdmitCardDto>> CreateFromAiImportAsync(AiImportAdmitCardRequest request, string userId);
    Task<ServiceResult<AdmitCardDto>> UpdateAsync(int id, UpsertAdmitCardRequest request, string userId);
    Task<BulkImportResult> BulkImportAsync(string csvContent, string userId);
    Task<string> ExportCsvAsync();
    Task<ServiceResult> DeleteAsync(int id);
}
