using System.Globalization;
using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Aspirant;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class AspirantProfileService : IAspirantProfileService
{
    private static readonly JsonSerializerOptions JsonRead = new() { PropertyNameCaseInsensitive = true };

    private readonly AppDbContext _db;

    public AspirantProfileService(AppDbContext db) => _db = db;

    public async Task<ServiceResult<AspirantProfileDto>> GetAsync(string userId)
    {
        var user = await _db.AspNetUsers.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return ServiceResult<AspirantProfileDto>.Fail("NotFound", "User not found.");

        var profile = await GetOrCreateProfileAsync(userId);
        return ServiceResult<AspirantProfileDto>.Ok(ToDto(user, profile));
    }

    public async Task<ServiceResult<AspirantProfileDto>> UpsertAsync(string userId, UpsertAspirantProfileRequest request)
    {
        var user = await _db.AspNetUsers.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return ServiceResult<AspirantProfileDto>.Fail("NotFound", "User not found.");

        var profile = await GetOrCreateProfileAsync(userId);

        // --- personal (split across AspNetUser + JobSeekerProfile) ---
        if (request.FirstName is not null) user.FirstName = request.FirstName.Trim();
        if (request.LastName is not null) user.LastName = request.LastName.Trim();
        if (request.Mobile is not null) user.PhoneNumber = Nullify(request.Mobile);
        if (request.DateOfBirth is not null) user.DateOfBirth = ParseDate(request.DateOfBirth);
        if (request.City is not null) { user.City = Nullify(request.City); profile.CurrentCity = user.City; }
        if (request.State is not null) user.State = Nullify(request.State);
        if (request.Gender is not null) profile.Gender = Nullify(request.Gender);
        if (request.District is not null) profile.District = Nullify(request.District);
        if (request.AboutMe is not null) profile.AboutMe = Nullify(request.AboutMe);
        if (request.Headline is not null) profile.Headline = Nullify(request.Headline);

        // --- education ---
        if (request.Education is not null)
        {
            var list = request.Education.Where(NotEmpty).ToList();
            profile.EducationJson = list.Count > 0 ? JsonSerializer.Serialize(list) : null;
            profile.Education = list.Count > 0
                ? string.Join(" | ", list.Select(e => string.Join(", ",
                    new[] { e.CourseDegree, e.Specialization, e.UniversityBoard, e.PassingYear, e.PercentageCgpa }
                        .Where(s => !string.IsNullOrWhiteSpace(s)))))
                : null;
        }

        // --- skills ---
        if (request.Skills is not null)
        {
            var s = Clean(request.Skills);
            var any = s.Technical.Count + s.Computer.Count + s.Languages.Count + s.Other.Count > 0;
            profile.SkillsJson = any ? JsonSerializer.Serialize(s) : null;
            var flat = s.Technical.Concat(s.Computer).Concat(s.Languages).Concat(s.Other).ToList();
            var csv = string.Join(", ", flat);
            profile.Skills = flat.Count > 0 ? (csv.Length > 1000 ? csv[..1000] : csv) : null;
        }

        // --- work experience ---
        if (request.WorkExperience is not null)
        {
            var list = request.WorkExperience.Where(NotEmpty).ToList();
            profile.WorkExperienceJson = list.Count > 0 ? JsonSerializer.Serialize(list) : null;
            profile.WorkExperience = list.Count > 0
                ? string.Join(" | ", list.Select(w => $"{w.JobTitle} at {w.Company} ({w.StartDate}–{(w.IsCurrent ? "Present" : w.EndDate)})".Trim()))
                : null;
            profile.ExperienceYears = EstimateYears(list);
        }

        // --- job preferences ---
        if (request.Preferences is not null)
        {
            var p = request.Preferences;
            p.PreferredLocations = p.PreferredLocations?.Select(x => x.Trim()).Where(x => x.Length > 0).Distinct().ToList() ?? new();
            var meaningful = !string.IsNullOrWhiteSpace(p.PreferredJobType) || !string.IsNullOrWhiteSpace(p.WorkMode)
                || p.PreferredLocations.Count > 0 || !string.IsNullOrWhiteSpace(p.ExpectedSalary)
                || !string.IsNullOrWhiteSpace(p.PreferredIndustry);
            profile.JobPreferencesJson = meaningful ? JsonSerializer.Serialize(p) : null;
            profile.PreferredCities = p.PreferredLocations.Count > 0
                ? Truncate(string.Join(", ", p.PreferredLocations), 300) : null;
            profile.ExpectedSalary = ParseMoney(p.ExpectedSalary);
            profile.IsOpenToWork = meaningful;
        }

        profile.UpdatedAt = DateTime.UtcNow;

        var checklist = BuildChecklist(user, profile);
        var score = Score(checklist);
        profile.ProfileCompletionScore = score;
        user.ProfileCompletionScore = score;
        if (profile.ProfileCompletedAt is null && checklist.Where(c => c.Required).All(c => c.Done))
            profile.ProfileCompletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceResult<AspirantProfileDto>.Ok(ToDto(user, profile));
    }

    public async Task<ServiceResult<AspirantProfileDto>> DeleteResumeAsync(string userId)
    {
        var user = await _db.AspNetUsers.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return ServiceResult<AspirantProfileDto>.Fail("NotFound", "User not found.");

        var profile = await GetOrCreateProfileAsync(userId);
        user.Resume = null;
        profile.ResumeUrl = null;
        profile.ResumeUploadedAt = null;

        var checklist = BuildChecklist(user, profile);
        var score = Score(checklist);
        profile.ProfileCompletionScore = score;
        user.ProfileCompletionScore = score;
        profile.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceResult<AspirantProfileDto>.Ok(ToDto(user, profile));
    }

    // ---------------------------------------------------------------- helpers

    private async Task<JobSeekerProfile> GetOrCreateProfileAsync(string userId)
    {
        var profile = await _db.JobSeekerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is not null) return profile;

        profile = new JobSeekerProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.JobSeekerProfiles.Add(profile);
        return profile;
    }

    private AspirantProfileDto ToDto(AspNetUser user, JobSeekerProfile p)
    {
        var checklist = BuildChecklist(user, p);
        return new AspirantProfileDto
        {
            PhotoUrl = user.ProfilePictureUrl,
            FullName = $"{user.FirstName} {user.LastName}".Trim(),
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email ?? "",
            Mobile = user.PhoneNumber,
            DateOfBirth = user.DateOfBirth?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Gender = p.Gender,
            City = user.City,
            District = p.District,
            State = user.State,
            AboutMe = p.AboutMe,
            Headline = p.Headline,
            Education = Deserialize<List<EducationEntry>>(p.EducationJson) ?? new(),
            Skills = Deserialize<SkillsBlock>(p.SkillsJson) ?? new(),
            WorkExperience = Deserialize<List<WorkExperienceEntry>>(p.WorkExperienceJson) ?? new(),
            Preferences = Deserialize<JobPreferences>(p.JobPreferencesJson) ?? new(),
            ResumeUrl = user.Resume,
            ResumeFileName = FileName(user.Resume),
            ResumeUploadedAt = p.ResumeUploadedAt?.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture),
            CompletionScore = Score(checklist),
            CompletionChecklist = checklist,
            NeedsSetup = p.ProfileCompletedAt is null,
        };
    }

    private static List<CompletionItem> BuildChecklist(AspNetUser user, JobSeekerProfile p)
    {
        var skills = TryDeserialize<SkillsBlock>(p.SkillsJson) ?? new();
        var skillCount = skills.Technical.Count + skills.Computer.Count + skills.Languages.Count + skills.Other.Count;
        var education = TryDeserialize<List<EducationEntry>>(p.EducationJson) ?? new();
        var work = TryDeserialize<List<WorkExperienceEntry>>(p.WorkExperienceJson) ?? new();
        var prefs = TryDeserialize<JobPreferences>(p.JobPreferencesJson) ?? new();
        var prefsFilled = !string.IsNullOrWhiteSpace(prefs.PreferredJobType) && !string.IsNullOrWhiteSpace(prefs.WorkMode);

        return new List<CompletionItem>
        {
            Item("name", "Full name", !string.IsNullOrWhiteSpace(user.FirstName) && !string.IsNullOrWhiteSpace(user.LastName), true),
            Item("mobile", "Mobile number", !string.IsNullOrWhiteSpace(user.PhoneNumber), true),
            Item("dob", "Date of birth", user.DateOfBirth is not null, true),
            Item("gender", "Gender", !string.IsNullOrWhiteSpace(p.Gender), true),
            Item("location", "Location & district", !string.IsNullOrWhiteSpace(user.City) && !string.IsNullOrWhiteSpace(p.District), true),
            Item("education", "At least one qualification", education.Count > 0, true),
            Item("skills", "At least 3 skills", skillCount >= 3, true),
            Item("preferences", "Job preferences", prefsFilled, true),
            Item("photo", "Profile photo", !string.IsNullOrWhiteSpace(user.ProfilePictureUrl), false),
            Item("about", "About me", !string.IsNullOrWhiteSpace(p.AboutMe), false),
            Item("experience", "Work experience", work.Count > 0, false),
            Item("resume", "Master résumé", !string.IsNullOrWhiteSpace(user.Resume), false),
        };
    }

    private static CompletionItem Item(string key, string label, bool done, bool required) =>
        new() { Key = key, Label = label, Done = done, Required = required };

    // Required items weigh double so the bar reflects "ready to be discovered", not just field count.
    private static int Score(List<CompletionItem> items)
    {
        double total = items.Sum(i => i.Required ? 2.0 : 1.0);
        double done = items.Where(i => i.Done).Sum(i => i.Required ? 2.0 : 1.0);
        return total <= 0 ? 0 : (int)Math.Round(done / total * 100);
    }

    private static bool NotEmpty(EducationEntry e) =>
        new[] { e.Qualification, e.CourseDegree, e.Specialization, e.PassingYear, e.UniversityBoard, e.PercentageCgpa }
            .Any(s => !string.IsNullOrWhiteSpace(s));

    private static bool NotEmpty(WorkExperienceEntry w) =>
        new[] { w.Company, w.JobTitle, w.StartDate, w.EndDate, w.Description }.Any(s => !string.IsNullOrWhiteSpace(s));

    private static SkillsBlock Clean(SkillsBlock s) => new()
    {
        Technical = Dedupe(s.Technical),
        Computer = Dedupe(s.Computer),
        Languages = Dedupe(s.Languages),
        Other = Dedupe(s.Other),
    };

    private static List<string> Dedupe(List<string>? xs) =>
        (xs ?? new()).Select(x => x.Trim()).Where(x => x.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase).Take(40).ToList();

    private static int EstimateYears(List<WorkExperienceEntry> list)
    {
        double months = 0;
        foreach (var w in list)
        {
            var start = ParseLoose(w.StartDate);
            var end = w.IsCurrent ? DateTime.UtcNow : ParseLoose(w.EndDate);
            if (start is not null && end is not null && end > start)
                months += (end.Value - start.Value).TotalDays / 30.44;
        }
        return (int)Math.Round(months / 12.0);
    }

    private static DateTime? ParseLoose(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        foreach (var fmt in new[] { "yyyy-MM-dd", "yyyy-MM", "yyyy/MM", "MM/yyyy", "yyyy" })
            if (DateTime.TryParseExact(s.Trim(), fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
                return d;
        return DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var any) ? any : null;
    }

    private static DateTime? ParseDate(string? s) => ParseLoose(s);

    private static decimal? ParseMoney(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var digits = new string(s.Where(c => char.IsDigit(c) || c == '.').ToArray());
        return decimal.TryParse(digits, NumberStyles.Any, CultureInfo.InvariantCulture, out var v) && v > 0 ? v : null;
    }

    private static string? Nullify(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];
    private static string? FileName(string? url) =>
        string.IsNullOrWhiteSpace(url) ? null : Uri.UnescapeDataString(url.Split('/').Last());

    private static T? Deserialize<T>(string? json) => TryDeserialize<T>(json);

    private static T? TryDeserialize<T>(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return default;
        try { return JsonSerializer.Deserialize<T>(json, JsonRead); }
        catch { return default; }
    }
}
