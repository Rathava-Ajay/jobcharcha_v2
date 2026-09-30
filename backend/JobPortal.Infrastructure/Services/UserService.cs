using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Users;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<UserAdminListItemDto>> GetAllForAdminAsync(string? search)
    {
        var query = _db.AspNetUsers.AsNoTracking()
            .Include(u => u.Roles)
            .Include(u => u.EmployerProfile)
            .Where(u => !u.IsDeleted).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(u =>
                EF.Functions.Like(u.FirstName, $"%{s}%") ||
                EF.Functions.Like(u.LastName, $"%{s}%") ||
                (u.Email != null && EF.Functions.Like(u.Email, $"%{s}%")));
        }

        var users = await query.OrderByDescending(u => u.CreatedDate).ToListAsync();
        return users.Select(ToDto).ToList();
    }

    public async Task<ServiceResult> SetActiveAsync(string id, bool isActive)
    {
        var user = await _db.AspNetUsers.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user is null) return ServiceResult.Fail("NotFound", "User not found.");

        user.IsActive = isActive;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> SetEmployerApprovalAsync(string userId, bool approved, string adminUserId)
    {
        var profile = await _db.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is null) return ServiceResult.Fail("NotFound", "No employer profile found for this account.");

        profile.IsVerified = approved;
        profile.VerifiedAt = approved ? DateTime.UtcNow : null;
        profile.VerifiedBy = approved ? adminUserId : null;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static UserAdminListItemDto ToDto(AspNetUser u) => new()
    {
        Id = u.Id,
        FirstName = u.FirstName,
        LastName = u.LastName,
        Email = u.Email,
        PhoneNumber = u.PhoneNumber,
        Role = ResolveDisplayRole(u),
        IsActive = u.IsActive,
        IsPremium = u.IsPremium,
        IsEmailVerified = u.IsEmailVerified,
        CreatedDate = u.CreatedDate.ToString("yyyy-MM-dd"),
        LastLoginDate = u.LastLoginDate?.ToString("yyyy-MM-dd"),
        SignupSource = u.SignupSource,
        SignupCampaign = u.SignupCampaign,
        EmployerProfileId = u.EmployerProfile != null ? u.EmployerProfile.Id : null,
        IsEmployerApproved = u.EmployerProfile != null ? u.EmployerProfile.IsVerified : null,
    };

    private static string ResolveDisplayRole(AspNetUser u) =>
        RoleMapper.ToUiRole(RoleMapper.ResolveDbRole(u.Roles.Select(r => r.Name)));
}
