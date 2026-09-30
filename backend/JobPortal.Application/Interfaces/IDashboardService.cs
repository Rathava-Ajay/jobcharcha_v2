using JobPortal.Application.DTOs.Dashboard;

namespace JobPortal.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetStatsAsync();
}
