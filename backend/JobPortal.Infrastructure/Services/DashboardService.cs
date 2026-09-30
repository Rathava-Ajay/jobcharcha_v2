using JobPortal.Application.DTOs.Dashboard;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardStatsDto> GetStatsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var totalJobs = await _db.Jobs.CountAsync();
        var draftJobs = await _db.Jobs.CountAsync(j => j.Status == 0);
        var expiredJobs = await _db.Jobs.CountAsync(j => j.Status != 0 && j.LastDate.Date < today);
        var activeJobs = totalJobs - draftJobs - expiredJobs;

        var totalUsers = await _db.AspNetUsers.CountAsync(u => !u.IsDeleted);
        var newUsersThisMonth = await _db.AspNetUsers.CountAsync(u => !u.IsDeleted && u.CreatedDate >= monthStart);
        var totalCategories = await _db.Categories.CountAsync(c => c.IsActive);

        var topCategories = await _db.Categories.AsNoTracking()
            .Where(c => c.IsActive)
            .Select(c => new CategoryCountDto { Name = c.Name, Count = c.Jobs.Count(j => j.IsActive) })
            .OrderByDescending(c => c.Count)
            .Take(5)
            .ToListAsync();

        var recentJobEntities = await _db.Jobs.AsNoTracking().Include(j => j.Category)
            .OrderByDescending(j => j.CreatedDate)
            .Take(5)
            .ToListAsync();

        return new DashboardStatsDto
        {
            TotalJobs = totalJobs,
            ActiveJobs = activeJobs,
            ExpiredJobs = expiredJobs,
            DraftJobs = draftJobs,
            TotalUsers = totalUsers,
            NewUsersThisMonth = newUsersThisMonth,
            TotalCategories = totalCategories,
            TopCategories = topCategories,
            RecentJobs = recentJobEntities.Select(j => new Application.DTOs.Jobs.JobListItemDto
            {
                Id = j.Id,
                Title = j.Title,
                Slug = j.Slug,
                CompanyOrDept = j.OrganizationName,
                Category = j.Category.Name,
                Location = j.Location ?? j.District ?? j.State ?? "Pan India",
                VacancyCount = j.TotalPosts ?? 0,
                Salary = j.Salary ?? "As per norms",
                Qualification = j.QualificationRequired ?? "Graduate",
                Type = "public",
                LastDate = j.LastDate.ToString("yyyy-MM-dd"),
                PostedDate = j.PostedDate.ToString("yyyy-MM-dd"),
                IsFeatured = j.IsFeatured,
                IsUrgent = j.IsUrgent,
                IsNew = j.IsNew,
                Status = j.Status == 0 ? "Draft" : (j.LastDate.Date < today ? "Expired" : "Active"),
            }).ToList(),
        };
    }
}
