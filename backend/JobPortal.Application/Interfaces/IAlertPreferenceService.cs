using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Alerts;

namespace JobPortal.Application.Interfaces;

public interface IAlertPreferenceService
{
    Task<ServiceResult<AlertPreferenceDto>> SubscribeAsync(SubscribeAlertRequest request);
    Task<ServiceResult> UnsubscribeAsync(string token);
    Task<List<AlertPreferenceAdminListItemDto>> GetAllForAdminAsync();
    Task<ServiceResult> SetActiveAsync(int id, bool isActive);
}
