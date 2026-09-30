using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Users;

namespace JobPortal.Application.Interfaces;

public interface IUserService
{
    Task<List<UserAdminListItemDto>> GetAllForAdminAsync(string? search);
    Task<ServiceResult> SetActiveAsync(string id, bool isActive);
    Task<ServiceResult> SetEmployerApprovalAsync(string userId, bool approved, string adminUserId);
}
