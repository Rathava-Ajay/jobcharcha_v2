using JobPortal.Application.DTOs.Settings;

namespace JobPortal.Application.Interfaces;

public interface ISettingsService
{
    Task<SiteSettingsDto> GetAsync();
    Task<SiteSettingsDto> UpdateAsync(SiteSettingsDto dto);
}
