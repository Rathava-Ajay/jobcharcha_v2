using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class TestService : ITestService
{
    private readonly AppDbContext _db;

    public TestService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TestListItemDto>> SearchAsync(int? categoryId, int? examId, string? search, bool? isFree)
    {
        var query = _db.Tests.AsNoTracking()
            .Include(t => t.Exam).ThenInclude(e => e.Category)
            .Where(t => t.IsActive && !t.IsDeleted)
            .AsQueryable();

        if (examId.HasValue) query = query.Where(t => t.ExamId == examId.Value);
        if (categoryId.HasValue) query = query.Where(t => t.Exam.CategoryId == categoryId.Value);
        if (isFree.HasValue) query = query.Where(t => t.IsFree == isFree.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(t => EF.Functions.Like(t.Title, $"%{s}%") || EF.Functions.Like(t.Exam.Name, $"%{s}%"));
        }

        var tests = await query.OrderBy(t => t.DisplayOrder).ThenBy(t => t.Title).ToListAsync();

        var testIds = tests.Select(t => t.Id).ToList();
        var attemptCounts = await _db.Attempts.AsNoTracking()
            .Where(a => testIds.Contains(a.TestId) && a.SubmittedAt != null)
            .GroupBy(a => a.TestId)
            .Select(g => new { TestId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TestId, x => x.Count);

        return tests.Select(t => ToListItemDto(t, attemptCounts.TryGetValue(t.Id, out var c) ? c : 0)).ToList();
    }

    public async Task<TestDetailDto?> GetBySlugAsync(string slug, string? userId)
    {
        var test = await _db.Tests.AsNoTracking()
            .Include(t => t.Exam).ThenInclude(e => e.Category)
            .Include(t => t.TestSections)
            .FirstOrDefaultAsync(t => t.Slug == slug && t.IsActive && !t.IsDeleted);
        if (test is null) return null;

        return await BuildDetailDtoAsync(test, userId);
    }

    public async Task<List<TestAdminListItemDto>> GetAllForAdminAsync()
    {
        var tests = await _db.Tests.AsNoTracking().Where(t => !t.IsDeleted)
            .Include(t => t.Exam).OrderByDescending(t => t.CreatedDate).ToListAsync();
        return tests.Select(t => new TestAdminListItemDto
        {
            Id = t.Id,
            Title = t.Title,
            Slug = t.Slug,
            ExamId = t.ExamId,
            ExamName = t.Exam.Name,
            IsFree = t.IsFree,
            Price = t.Price,
            TotalQuestions = t.TotalQuestions,
            IsActive = t.IsActive,
        }).ToList();
    }

    public async Task<ServiceResult<TestDetailDto>> CreateAsync(UpsertTestRequest request, string userId)
    {
        var exam = await _db.Exams.FindAsync(request.ExamId);
        if (exam is null) return ServiceResult<TestDetailDto>.Fail("NotFound", "Exam not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        slug = await EnsureUniqueSlugAsync(slug, null);

        var test = new Test
        {
            ExamId = request.ExamId,
            Title = request.Title,
            Slug = slug,
            Type = 1,
            DurationMinutes = request.DurationMinutes,
            NegativeMarking = request.NegativeMarking,
            MarksPerQuestion = request.MarksPerQuestion,
            IsFree = request.IsFree,
            Price = request.IsFree ? null : request.Price,
            ShuffleQuestions = false,
            ShuffleOptions = false,
            Status = 1,
            Instructions = request.Instructions,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
        };
        _db.Tests.Add(test);
        await _db.SaveChangesAsync();

        await AddSectionsAndQuestionsAsync(test, request.Sections);
        await RecomputeTotalsAsync(test.Id);

        var saved = await _db.Tests.AsNoTracking()
            .Include(t => t.Exam).ThenInclude(e => e.Category)
            .Include(t => t.TestSections)
            .FirstAsync(t => t.Id == test.Id);
        return ServiceResult<TestDetailDto>.Ok(await BuildDetailDtoAsync(saved, null));
    }

    public async Task<ServiceResult<TestDetailDto>> UpdateAsync(int id, UpsertTestRequest request)
    {
        var test = await _db.Tests.FindAsync(id);
        if (test is null) return ServiceResult<TestDetailDto>.Fail("NotFound", "Test not found.");

        var exam = await _db.Exams.FindAsync(request.ExamId);
        if (exam is null) return ServiceResult<TestDetailDto>.Fail("NotFound", "Exam not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Title) : Slugify(request.Slug);
        if (slug != test.Slug) slug = await EnsureUniqueSlugAsync(slug, id);

        test.ExamId = request.ExamId;
        test.Title = request.Title;
        test.Slug = slug;
        test.DurationMinutes = request.DurationMinutes;
        test.NegativeMarking = request.NegativeMarking;
        test.MarksPerQuestion = request.MarksPerQuestion;
        test.IsFree = request.IsFree;
        test.Price = request.IsFree ? null : request.Price;
        test.Instructions = request.Instructions;
        test.DisplayOrder = request.DisplayOrder;
        test.IsActive = request.IsActive;
        test.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Replace sections/questions wholesale — simplest correct semantics for admin content editing.
        var existingQuestions = await _db.Questions.Where(q => q.TestId == id).ToListAsync();
        _db.Questions.RemoveRange(existingQuestions);
        var existingSections = await _db.TestSections.Where(s => s.TestId == id).ToListAsync();
        _db.TestSections.RemoveRange(existingSections);
        await _db.SaveChangesAsync();

        await AddSectionsAndQuestionsAsync(test, request.Sections);
        await RecomputeTotalsAsync(id);

        var saved = await _db.Tests.AsNoTracking()
            .Include(t => t.Exam).ThenInclude(e => e.Category)
            .Include(t => t.TestSections)
            .FirstAsync(t => t.Id == id);
        return ServiceResult<TestDetailDto>.Ok(await BuildDetailDtoAsync(saved, null));
    }

    /// <summary>Soft-delete (archive): the test disappears from the public catalogue and the admin
    /// list, but the row, its questions/sections, and every attempt + purchase stay in the DB so
    /// existing users' history and analytics are untouched. Idempotent — deleting an already-deleted
    /// test just succeeds.</summary>
    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var test = await _db.Tests.FindAsync(id);
        if (test is null) return ServiceResult.Fail("NotFound", "Test not found.");

        if (test.IsDeleted) return ServiceResult.Ok();

        test.IsDeleted = true;
        test.IsActive = false;
        test.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task AddSectionsAndQuestionsAsync(Test test, List<UpsertTestSectionRequest> sections)
    {
        foreach (var sectionReq in sections)
        {
            var section = new TestSection
            {
                TestId = test.Id,
                Name = sectionReq.Name,
                DisplayOrder = sectionReq.DisplayOrder,
                QuestionCount = sectionReq.Questions.Count,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
            };
            _db.TestSections.Add(section);
            await _db.SaveChangesAsync();

            foreach (var qReq in sectionReq.Questions)
            {
                _db.Questions.Add(new Question
                {
                    ExamId = test.ExamId,
                    TestId = test.Id,
                    SectionId = section.Id,
                    Subject = qReq.Subject,
                    Topic = qReq.Topic,
                    Difficulty = 1,
                    QuestionTextEn = qReq.QuestionTextEn,
                    OptionAen = qReq.OptionAEn,
                    OptionBen = qReq.OptionBEn,
                    OptionCen = qReq.OptionCEn,
                    OptionDen = qReq.OptionDEn,
                    CorrectOption = qReq.CorrectOption,
                    ExplanationEn = qReq.ExplanationEn,
                    Marks = qReq.Marks,
                    DisplayOrder = qReq.DisplayOrder,
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow,
                });
            }
        }
        await _db.SaveChangesAsync();
    }

    private async Task RecomputeTotalsAsync(int testId)
    {
        var questions = await _db.Questions.Where(q => q.TestId == testId && q.IsActive).ToListAsync();
        var test = await _db.Tests.FindAsync(testId);
        if (test is null) return;
        test.TotalQuestions = questions.Count;
        test.TotalMarks = (int)questions.Sum(q => q.Marks);
        await _db.SaveChangesAsync();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, int? excludeId)
    {
        var slug = baseSlug;
        var suffix = 1;
        while (await _db.Tests.AnyAsync(t => t.Slug == slug && t.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    private async Task<TestDetailDto> BuildDetailDtoAsync(Test test, string? userId)
    {
        var questionCounts = await _db.Questions.AsNoTracking()
            .Where(q => q.TestId == test.Id && q.IsActive)
            .GroupBy(q => q.SectionId ?? 0)
            .Select(g => new { SectionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SectionId, x => x.Count);

        var isLocked = false;
        var hasInProgress = false;
        if (!test.IsFree)
        {
            isLocked = userId is null || !await HasAccessAsync(userId, test.Id);
        }
        if (userId is not null)
        {
            hasInProgress = await _db.Attempts.AsNoTracking()
                .AnyAsync(a => a.UserId == userId && a.TestId == test.Id && a.SubmittedAt == null && a.EndsAt > DateTime.UtcNow);
        }

        return new TestDetailDto
        {
            Id = test.Id,
            Title = test.Title,
            Slug = test.Slug,
            ExamId = test.ExamId,
            ExamName = test.Exam.Name,
            CategoryId = test.Exam.CategoryId,
            CategoryName = test.Exam.Category?.Name ?? "General",
            DurationMinutes = test.DurationMinutes,
            TotalQuestions = test.TotalQuestions,
            TotalMarks = test.TotalMarks,
            NegativeMarking = test.NegativeMarking,
            MarksPerQuestion = test.MarksPerQuestion,
            IsFree = test.IsFree,
            Price = test.Price,
            Instructions = test.Instructions,
            TitleGu = test.TitleGujarati,
            InstructionsGu = test.InstructionsGujarati,
            IsLocked = isLocked,
            HasInProgressAttempt = hasInProgress,
            Sections = test.TestSections
                .Where(s => s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .Select(s => new TestSectionDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    DisplayOrder = s.DisplayOrder,
                    QuestionCount = questionCounts.TryGetValue(s.Id, out var c) ? c : (s.QuestionCount ?? 0),
                })
                .ToList(),
        };
    }

    internal static async Task<bool> HasAccessAsync(AppDbContext db, string userId, int testId)
    {
        var purchased = await db.TestPurchases.AsNoTracking().AnyAsync(p => p.UserId == userId && p.TestId == testId);
        if (purchased) return true;

        return await db.Subscriptions.AsNoTracking().Include(s => s.Plan)
            .AnyAsync(s => s.UserId == userId
                && s.Status.ToLower() == "active"
                && s.ExpiresAt > DateTime.UtcNow
                && s.Plan.UnlocksAllTests);
    }

    private Task<bool> HasAccessAsync(string userId, int testId) => HasAccessAsync(_db, userId, testId);

    private static TestListItemDto ToListItemDto(Test t, int attemptsCount) => new()
    {
        Id = t.Id,
        Title = t.Title,
        Slug = t.Slug,
        ExamId = t.ExamId,
        ExamName = t.Exam.Name,
        CategoryId = t.Exam.CategoryId,
        CategoryName = t.Exam.Category?.Name ?? "General",
        DurationMinutes = t.DurationMinutes,
        TotalQuestions = t.TotalQuestions,
        TotalMarks = t.TotalMarks,
        IsFree = t.IsFree,
        Price = t.Price,
        AttemptsCount = attemptsCount,
    };
}
