using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Tests;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class TestAttemptService : ITestAttemptService
{
    // Attempt.Status convention owned by this service — no other feature reads/writes this column yet.
    private const int StatusInProgress = 1;
    private const int StatusSubmitted = 2;

    private readonly AppDbContext _db;

    public TestAttemptService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ServiceResult<AttemptSessionDto>> StartAsync(int testId, string userId)
    {
        var test = await _db.Tests.Include(t => t.TestSections).FirstOrDefaultAsync(t => t.Id == testId && t.IsActive);
        if (test is null) return ServiceResult<AttemptSessionDto>.Fail("NotFound", "Test not found.");

        if (!test.IsFree && !await TestService.HasAccessAsync(_db, userId, testId))
            return ServiceResult<AttemptSessionDto>.Fail("PremiumLocked", "This is a premium test. Purchase it or subscribe to a plan that unlocks all tests.");

        var existing = await _db.Attempts.FirstOrDefaultAsync(a =>
            a.UserId == userId && a.TestId == testId && a.SubmittedAt == null && a.EndsAt > DateTime.UtcNow);
        if (existing is not null) return await BuildSessionAsync(existing, test);

        var questions = await _db.Questions.AsNoTracking()
            .Where(q => q.TestId == testId && q.IsActive)
            .OrderBy(q => q.DisplayOrder)
            .ToListAsync();

        if (test.ShuffleQuestions)
        {
            questions = questions
                .GroupBy(q => q.SectionId ?? 0)
                .OrderBy(g => g.Key)
                .SelectMany(g => Shuffle(g.ToList()))
                .ToList();
        }

        var now = DateTime.UtcNow;
        var attempt = new Attempt
        {
            UserId = userId,
            TestId = testId,
            Status = StatusInProgress,
            StartedAt = now,
            EndsAt = now.AddMinutes(test.DurationMinutes),
            RemainingSeconds = test.DurationMinutes * 60,
            QuestionOrderJson = JsonSerializer.Serialize(questions.Select(q => q.Id)),
            CurrentQuestionIndex = 0,
            CreatedDate = now,
            IsActive = true,
        };
        _db.Attempts.Add(attempt);
        await _db.SaveChangesAsync();

        _db.Responses.AddRange(questions.Select(q => new Response
        {
            AttemptId = attempt.Id,
            QuestionId = q.Id,
            IsMarkedForReview = false,
            IsVisited = false,
            UpdatedAt = now,
        }));
        await _db.SaveChangesAsync();

        return await BuildSessionAsync(attempt, test);
    }

    public async Task<ServiceResult<AttemptSessionDto>> GetSessionAsync(int attemptId, string userId)
    {
        var attempt = await _db.Attempts.FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);
        if (attempt is null) return ServiceResult<AttemptSessionDto>.Fail("NotFound", "Attempt not found.");
        if (attempt.SubmittedAt is not null)
            return ServiceResult<AttemptSessionDto>.Fail("AlreadySubmitted", "This attempt has already been submitted.");

        var test = await _db.Tests.FirstAsync(t => t.Id == attempt.TestId);
        if (attempt.EndsAt <= DateTime.UtcNow)
        {
            await SubmitInternalAsync(attempt, test);
            return ServiceResult<AttemptSessionDto>.Fail("AttemptExpired", "Time is up — this attempt was automatically submitted.");
        }

        return await BuildSessionAsync(attempt, test);
    }

    public async Task<ServiceResult> SaveResponseAsync(int attemptId, string userId, SaveResponseRequest request)
    {
        var attempt = await _db.Attempts.FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);
        if (attempt is null) return ServiceResult.Fail("NotFound", "Attempt not found.");
        if (attempt.SubmittedAt is not null) return ServiceResult.Fail("AlreadySubmitted", "This attempt has already been submitted.");
        if (attempt.EndsAt <= DateTime.UtcNow) return ServiceResult.Fail("AttemptExpired", "Time is up for this attempt.");

        var response = await _db.Responses.FirstOrDefaultAsync(r => r.AttemptId == attemptId && r.QuestionId == request.QuestionId);
        if (response is null) return ServiceResult.Fail("NotFound", "Question does not belong to this attempt.");

        var now = DateTime.UtcNow;
        response.SelectedOption = string.IsNullOrEmpty(request.SelectedOption) ? null : request.SelectedOption;
        response.IsMarkedForReview = request.IsMarkedForReview;
        response.IsVisited = true;
        response.AnsweredAt = response.SelectedOption is not null ? now : null;
        response.UpdatedAt = now;
        await _db.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<AttemptResultDto>> SubmitAsync(int attemptId, string userId)
    {
        var attempt = await _db.Attempts.FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);
        if (attempt is null) return ServiceResult<AttemptResultDto>.Fail("NotFound", "Attempt not found.");

        var test = await _db.Tests.FirstAsync(t => t.Id == attempt.TestId);
        if (attempt.SubmittedAt is null) await SubmitInternalAsync(attempt, test);

        return await GetResultAsync(attemptId, userId);
    }

    public async Task<List<AttemptHistoryItemDto>> GetMyHistoryAsync(string userId)
    {
        var attempts = await _db.Attempts.AsNoTracking()
            .Include(a => a.Test).ThenInclude(t => t.Exam).ThenInclude(e => e.Category)
            .Include(a => a.ResultsAnalytic)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartedAt)
            .ToListAsync();

        return attempts.Select(a => new AttemptHistoryItemDto
        {
            AttemptId = a.Id,
            TestId = a.TestId,
            TestTitle = a.Test.Title,
            TestSlug = a.Test.Slug,
            ExamName = a.Test.Exam.Name,
            CategoryName = a.Test.Exam.Category?.Name ?? "General",
            StartedAt = a.StartedAt,
            SubmittedAt = a.SubmittedAt,
            IsCompleted = a.SubmittedAt is not null,
            Score = a.ResultsAnalytic?.Score,
            MaxScore = a.ResultsAnalytic?.MaxScore,
            AccuracyPercent = a.ResultsAnalytic?.AccuracyPercent,
        }).ToList();
    }

    public async Task<ServiceResult<AttemptResultDto>> GetResultAsync(int attemptId, string userId)
    {
        var attempt = await _db.Attempts.AsNoTracking()
            .Include(a => a.Test)
            .Include(a => a.ResultsAnalytic)
            .Include(a => a.Responses).ThenInclude(r => r.Question)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);
        if (attempt is null) return ServiceResult<AttemptResultDto>.Fail("NotFound", "Attempt not found.");
        if (attempt.SubmittedAt is null || attempt.ResultsAnalytic is null)
            return ServiceResult<AttemptResultDto>.Fail("NotSubmitted", "This attempt has not been submitted yet.");

        var order = DeserializeOrder(attempt.QuestionOrderJson);
        var responsesByQuestion = attempt.Responses.ToDictionary(r => r.QuestionId);
        var orderedQuestionIds = order.Count > 0 ? order : attempt.Responses.Select(r => r.QuestionId).ToList();

        // All India Rank / percentile comparison against other real attempts is a premium perk
        // on top of free test access — reuses the exact same purchase/subscription check that
        // gates the test itself, so a paid-for or subscription-unlocked test always sees it.
        var hasFullAnalytics = await TestService.HasAccessAsync(_db, userId, attempt.TestId);

        var analytic = attempt.ResultsAnalytic;
        return ServiceResult<AttemptResultDto>.Ok(new AttemptResultDto
        {
            AttemptId = attempt.Id,
            TestId = attempt.TestId,
            TestTitle = attempt.Test.Title,
            TestTitleGu = attempt.Test.TitleGujarati,
            Score = analytic.Score,
            MaxScore = analytic.MaxScore,
            AccuracyPercent = analytic.AccuracyPercent,
            Percentile = hasFullAnalytics ? analytic.Percentile : null,
            AllIndiaRank = hasFullAnalytics ? analytic.AllIndiaRank : null,
            AnalyticsLocked = !hasFullAnalytics,
            TotalAttempts = await _db.ResultsAnalytics.AsNoTracking().CountAsync(r => r.TestId == attempt.TestId),
            CorrectCount = analytic.CorrectCount,
            WrongCount = analytic.WrongCount,
            UnansweredCount = analytic.UnansweredCount,
            TotalTimeSeconds = analytic.TotalTimeSeconds,
            SubmittedAt = attempt.SubmittedAt.Value,
            Questions = orderedQuestionIds
                .Where(qId => responsesByQuestion.ContainsKey(qId))
                .Select(qId => responsesByQuestion[qId])
                .Select(r => new AttemptResultQuestionDto
                {
                    QuestionId = r.QuestionId,
                    QuestionText = r.Question.QuestionTextEn,
                    OptionA = r.Question.OptionAen,
                    OptionB = r.Question.OptionBen,
                    OptionC = r.Question.OptionCen,
                    OptionD = r.Question.OptionDen,
                    QuestionTextGu = r.Question.QuestionTextGu,
                    OptionAGu = r.Question.OptionAgu,
                    OptionBGu = r.Question.OptionBgu,
                    OptionCGu = r.Question.OptionCgu,
                    OptionDGu = r.Question.OptionDgu,
                    CorrectOption = r.Question.CorrectOption,
                    SelectedOption = r.SelectedOption,
                    Explanation = r.Question.ExplanationEn,
                    ExplanationGu = r.Question.ExplanationGu,
                    Marks = r.Question.Marks,
                })
                .ToList(),
        });
    }

    private async Task SubmitInternalAsync(Attempt attempt, Test test)
    {
        var responses = await _db.Responses.Include(r => r.Question)
            .Where(r => r.AttemptId == attempt.Id).ToListAsync();

        var correct = responses.Count(r => r.SelectedOption is not null && r.SelectedOption == r.Question.CorrectOption);
        var wrong = responses.Count(r => r.SelectedOption is not null && r.SelectedOption != r.Question.CorrectOption);
        var unanswered = responses.Count(r => r.SelectedOption is null);

        var score = correct * test.MarksPerQuestion - wrong * test.NegativeMarking;
        var accuracy = (correct + wrong) > 0 ? Math.Round((decimal)correct / (correct + wrong) * 100, 2) : 0m;

        var now = DateTime.UtcNow;
        attempt.Status = StatusSubmitted;
        attempt.SubmittedAt = now;
        attempt.RemainingSeconds = 0;

        var totalTimeSeconds = (int)Math.Clamp((now - attempt.StartedAt).TotalSeconds, 0, test.DurationMinutes * 60);

        var analytic = await _db.ResultsAnalytics.FirstOrDefaultAsync(r => r.AttemptId == attempt.Id);
        if (analytic is null)
        {
            analytic = new ResultsAnalytic { AttemptId = attempt.Id, UserId = attempt.UserId, TestId = attempt.TestId };
            _db.ResultsAnalytics.Add(analytic);
        }
        analytic.Score = score;
        analytic.MaxScore = test.TotalMarks;
        analytic.AccuracyPercent = accuracy;
        analytic.CorrectCount = correct;
        analytic.WrongCount = wrong;
        analytic.UnansweredCount = unanswered;
        analytic.TotalTimeSeconds = totalTimeSeconds;
        analytic.ComputedAt = now;

        await _db.SaveChangesAsync();

        var allScores = await _db.ResultsAnalytics.AsNoTracking()
            .Where(r => r.TestId == attempt.TestId).Select(r => r.Score).ToListAsync();
        var totalAttempts = allScores.Count;
        analytic.AllIndiaRank = allScores.Count(s => s > score) + 1;
        analytic.Percentile = totalAttempts > 0 ? Math.Round((decimal)allScores.Count(s => s <= score) / totalAttempts * 100, 2) : 100m;
        await _db.SaveChangesAsync();
    }

    private async Task<ServiceResult<AttemptSessionDto>> BuildSessionAsync(Attempt attempt, Test test)
    {
        var order = DeserializeOrder(attempt.QuestionOrderJson);
        var questions = await _db.Questions.AsNoTracking()
            .Where(q => q.TestId == test.Id && order.Contains(q.Id))
            .Include(q => q.Section)
            .ToListAsync();
        var byId = questions.ToDictionary(q => q.Id);

        var responses = await _db.Responses.AsNoTracking()
            .Where(r => r.AttemptId == attempt.Id).ToDictionaryAsync(r => r.QuestionId);

        var sections = new List<AttemptSectionDto>();
        foreach (var qId in order)
        {
            if (!byId.TryGetValue(qId, out var q)) continue;
            var sectionName = q.Section?.Name ?? "General";
            var section = sections.FirstOrDefault(s => s.Name == sectionName);
            if (section is null)
            {
                section = new AttemptSectionDto { Name = sectionName };
                sections.Add(section);
            }
            responses.TryGetValue(qId, out var r);
            section.Questions.Add(new AttemptQuestionDto
            {
                Id = q.Id,
                DisplayOrder = q.DisplayOrder,
                Subject = q.Subject,
                Topic = q.Topic,
                QuestionText = q.QuestionTextEn,
                OptionA = q.OptionAen,
                OptionB = q.OptionBen,
                OptionC = q.OptionCen,
                OptionD = q.OptionDen,
                QuestionTextGu = q.QuestionTextGu,
                OptionAGu = q.OptionAgu,
                OptionBGu = q.OptionBgu,
                OptionCGu = q.OptionCgu,
                OptionDGu = q.OptionDgu,
                Marks = q.Marks,
                SelectedOption = r?.SelectedOption,
                IsMarkedForReview = r?.IsMarkedForReview ?? false,
                IsVisited = r?.IsVisited ?? false,
            });
        }

        return ServiceResult<AttemptSessionDto>.Ok(new AttemptSessionDto
        {
            AttemptId = attempt.Id,
            TestId = test.Id,
            TestTitle = test.Title,
            TestTitleGu = test.TitleGujarati,
            DurationMinutes = test.DurationMinutes,
            StartedAt = attempt.StartedAt,
            EndsAt = attempt.EndsAt,
            RemainingSeconds = Math.Max(0, (int)(attempt.EndsAt - DateTime.UtcNow).TotalSeconds),
            HasGujarati = questions.Any(q => !string.IsNullOrWhiteSpace(q.QuestionTextGu)),
            Sections = sections,
        });
    }

    private static List<int> DeserializeOrder(string? json) =>
        string.IsNullOrEmpty(json) ? new List<int>() : JsonSerializer.Deserialize<List<int>>(json) ?? new List<int>();

    private static List<Question> Shuffle(List<Question> list)
    {
        var rng = Random.Shared;
        var arr = list.ToList();
        for (var i = arr.Count - 1; i > 0; i--)
        {
            var j = rng.Next(i + 1);
            (arr[i], arr[j]) = (arr[j], arr[i]);
        }
        return arr;
    }
}
