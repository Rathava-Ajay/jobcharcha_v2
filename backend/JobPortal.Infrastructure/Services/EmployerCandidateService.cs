using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Employer;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class EmployerCandidateService : IEmployerCandidateService
{
    private readonly AppDbContext _db;

    public EmployerCandidateService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<CandidateListItemDto>> SearchAsync(CandidateSearchQuery query, int employerProfileId)
    {
        var q = _db.JobSeekerProfiles.AsNoTracking().Include(p => p.User).Where(p => p.IsOpenToWork).AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Skills))
            q = q.Where(p => p.Skills != null && p.Skills.Contains(query.Skills));
        if (query.MinExperience.HasValue)
            q = q.Where(p => p.ExperienceYears >= query.MinExperience.Value);
        if (query.MaxExperience.HasValue)
            q = q.Where(p => p.ExperienceYears <= query.MaxExperience.Value);
        if (!string.IsNullOrWhiteSpace(query.City))
            q = q.Where(p => p.CurrentCity != null && p.CurrentCity.Contains(query.City));
        if (query.MinSalary.HasValue)
            q = q.Where(p => p.ExpectedSalary == null || p.ExpectedSalary >= query.MinSalary.Value);
        if (query.MaxSalary.HasValue)
            q = q.Where(p => p.ExpectedSalary == null || p.ExpectedSalary <= query.MaxSalary.Value);
        if (!string.IsNullOrWhiteSpace(query.Education))
            q = q.Where(p => p.Education != null && p.Education.Contains(query.Education));
        if (query.MaxNoticePeriodDays.HasValue)
            q = q.Where(p => p.NoticePeriodDays <= query.MaxNoticePeriodDays.Value);

        var totalCount = await q.CountAsync();
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 100 ? 20 : query.PageSize;

        var profiles = await q.OrderByDescending(p => p.ProfileCompletionScore).ThenByDescending(p => p.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var candidateUserIds = profiles.Select(p => p.UserId).ToList();
        var contactedUserIds = await _db.EmployerContactLogs.AsNoTracking()
            .Where(c => c.EmployerProfileId == employerProfileId && c.Status == "success" && candidateUserIds.Contains(c.CandidateUserId))
            .Select(c => c.CandidateUserId)
            .Distinct()
            .ToListAsync();
        var contactedSet = contactedUserIds.ToHashSet();

        var items = profiles.Select(p => new CandidateListItemDto
        {
            UserId = p.UserId,
            Name = $"{p.User.FirstName} {p.User.LastName}".Trim(),
            Headline = p.Headline,
            ExperienceYears = p.ExperienceYears,
            CurrentCity = p.CurrentCity,
            ExpectedSalary = p.ExpectedSalary,
            Skills = p.Skills,
            Education = p.Education,
            NoticePeriodDays = p.NoticePeriodDays,
            MaskedPhone = MaskPhone(p.User.PhoneNumber),
            MaskedEmail = MaskEmail(p.User.Email),
            IsAlreadyContacted = contactedSet.Contains(p.UserId),
        }).ToList();

        return new PagedResult<CandidateListItemDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<ServiceResult<CandidateProfileDto>> GetProfileAsync(string candidateUserId, int employerProfileId)
    {
        var profile = await _db.JobSeekerProfiles.AsNoTracking().Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == candidateUserId);
        if (profile is null) return ServiceResult<CandidateProfileDto>.Fail("NotFound", "Candidate not found.");

        var alreadyContacted = await _db.EmployerContactLogs.AsNoTracking()
            .AnyAsync(c => c.EmployerProfileId == employerProfileId && c.CandidateUserId == candidateUserId && c.Status == "success");

        return ServiceResult<CandidateProfileDto>.Ok(new CandidateProfileDto
        {
            UserId = profile.UserId,
            Name = $"{profile.User.FirstName} {profile.User.LastName}".Trim(),
            Headline = profile.Headline,
            AboutMe = profile.AboutMe,
            ResumeUrl = profile.ResumeUrl,
            Skills = profile.Skills,
            ExperienceYears = profile.ExperienceYears,
            CurrentSalary = profile.CurrentSalary,
            ExpectedSalary = profile.ExpectedSalary,
            NoticePeriodDays = profile.NoticePeriodDays,
            CurrentCity = profile.CurrentCity,
            PreferredCities = profile.PreferredCities,
            Education = profile.Education,
            WorkExperience = profile.WorkExperience,
            IsAlreadyContacted = alreadyContacted,
            Phone = alreadyContacted ? (profile.User.PhoneNumber ?? "Not provided") : MaskPhone(profile.User.PhoneNumber),
            Email = alreadyContacted ? (profile.User.Email ?? "Not provided") : MaskEmail(profile.User.Email),
        });
    }

    private static string MaskPhone(string? phone) =>
        string.IsNullOrWhiteSpace(phone) ? "Not provided" : "+91-XXXXXXXXXX";

    private static string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return "Not provided";
        var parts = email.Split('@', 2);
        var name = parts[0];
        var masked = name.Length <= 1 ? "*" : name[0] + new string('*', Math.Max(3, name.Length - 1));
        return $"{masked}@{parts[1]}";
    }
}
