using JobPortal.Application.DTOs.Jobs;

namespace JobPortal.Application.DTOs.Dashboard;

public class CategoryCountDto
{
    public string Name { get; set; } = null!;
    public int Count { get; set; }
}

public class DashboardStatsDto
{
    public int TotalJobs { get; set; }
    public int ActiveJobs { get; set; }
    public int ExpiredJobs { get; set; }
    public int DraftJobs { get; set; }
    public int TotalUsers { get; set; }
    public int NewUsersThisMonth { get; set; }
    public int TotalCategories { get; set; }
    public List<CategoryCountDto> TopCategories { get; set; } = new();
    public List<JobListItemDto> RecentJobs { get; set; } = new();
}
