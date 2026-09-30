using JobPortal.Application.Common;
using JobPortal.Application.DTOs.CutOffs;

namespace JobPortal.Application.Interfaces;

public interface ICutOffService
{
    Task<List<CutOffExamOptionDto>> GetExamsAsync();
    Task<List<string>> GetPostNamesAsync(string slug);
    Task<List<CutOffRecordDto>> SearchAsync(string? slug, int? year, string? postName);
    Task<ServiceResult<CutOffPredictionDto>> PredictAsync(string slug, string postName, string category);
}
