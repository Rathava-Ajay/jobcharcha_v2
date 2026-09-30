using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.DailyQuizzes;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class DailyQuizService : IDailyQuizService
{
    private readonly AppDbContext _db;

    public DailyQuizService(AppDbContext db)
    {
        _db = db;
    }

    public Task<DailyQuizDto?> GetTodayAsync() => GetByDateAsync(DateOnly.FromDateTime(DateTime.UtcNow));

    public async Task<DailyQuizDto?> GetByDateAsync(DateOnly date)
    {
        var quiz = await _db.DailyQuizzes.AsNoTracking()
            .Include(q => q.DailyQuizQuestions)
            .FirstOrDefaultAsync(q => q.QuizDate == date && q.IsPublished && q.IsActive);
        if (quiz is null) return null;

        return new DailyQuizDto
        {
            Id = quiz.Id,
            QuizDate = quiz.QuizDate.ToString("yyyy-MM-dd"),
            Title = quiz.Title,
            Description = quiz.Description,
            Questions = quiz.DailyQuizQuestions
                .Where(q => q.IsActive)
                .OrderBy(q => q.DisplayOrder)
                .Select(q => new DailyQuizQuestionDto
                {
                    Id = q.Id,
                    DisplayOrder = q.DisplayOrder,
                    Topic = q.Topic,
                    QuestionText = q.QuestionTextEn,
                    OptionA = q.OptionAen,
                    OptionB = q.OptionBen,
                    OptionC = q.OptionCen,
                    OptionD = q.OptionDen,
                })
                .ToList(),
        };
    }

    public async Task<List<string>> GetAvailableDatesAsync() =>
        (await _db.DailyQuizzes.AsNoTracking()
            .Where(q => q.IsPublished && q.IsActive)
            .OrderByDescending(q => q.QuizDate)
            .Take(30)
            .Select(q => q.QuizDate)
            .ToListAsync())
        .Select(d => d.ToString("yyyy-MM-dd"))
        .ToList();

    public async Task<DailyQuizResultDto?> GetMyAttemptAsync(int dailyQuizId, string? userId, string? guestKey)
    {
        var attempt = await FindAttemptAsync(dailyQuizId, userId, guestKey);
        return attempt is null ? null : await BuildResultAsync(attempt);
    }

    public async Task<ServiceResult<DailyQuizResultDto>> SubmitAsync(int dailyQuizId, string? userId, SubmitDailyQuizRequest request)
    {
        if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(request.GuestKey))
            return ServiceResult<DailyQuizResultDto>.Fail("GuestKeyRequired", "A guest key is required for anonymous attempts.");

        var existing = await FindAttemptAsync(dailyQuizId, userId, request.GuestKey);
        if (existing is not null)
            return ServiceResult<DailyQuizResultDto>.Ok(await BuildResultAsync(existing));

        var quiz = await _db.DailyQuizzes.Include(q => q.DailyQuizQuestions)
            .FirstOrDefaultAsync(q => q.Id == dailyQuizId && q.IsPublished && q.IsActive);
        if (quiz is null) return ServiceResult<DailyQuizResultDto>.Fail("NotFound", "Quiz not found.");

        var questions = quiz.DailyQuizQuestions.Where(q => q.IsActive).ToList();
        var answersByQuestion = request.Answers.ToDictionary(a => a.QuestionId, a => a.SelectedOption);

        var correctCount = questions.Count(q =>
            answersByQuestion.TryGetValue(q.Id, out var selected) && selected == q.CorrectOption);
        var total = questions.Count;
        var scorePercent = total > 0 ? Math.Round((decimal)correctCount / total * 100, 2) : 0m;

        var attempt = new DailyQuizAttempt
        {
            DailyQuizId = dailyQuizId,
            UserId = userId,
            GuestKey = string.IsNullOrWhiteSpace(userId) ? request.GuestKey : null,
            CorrectCount = correctCount,
            TotalQuestions = total,
            ScorePercent = scorePercent,
            AnswersJson = JsonSerializer.Serialize(answersByQuestion),
            CompletedAt = DateTime.UtcNow,
        };
        _db.DailyQuizAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        return ServiceResult<DailyQuizResultDto>.Ok(await BuildResultAsync(attempt));
    }

    public async Task<ServiceResult<DailyQuizDto>> CreateFromAiImportAsync(AiImportDailyQuizRequest request, string userId)
    {
        if (!DateOnly.TryParse(request.QuizDate, out var quizDate))
            return ServiceResult<DailyQuizDto>.Fail("InvalidDate", "quizDate must be a valid YYYY-MM-DD date.");

        var exists = await _db.DailyQuizzes.AnyAsync(q => q.QuizDate == quizDate);
        if (exists)
            return ServiceResult<DailyQuizDto>.Fail("DuplicateDate", $"A quiz already exists for {quizDate:yyyy-MM-dd}.");

        var quiz = new DailyQuiz
        {
            QuizDate = quizDate,
            Title = request.Title,
            Description = request.Description,
            IsPublished = request.AutoPublish,
            IsActive = true,
            CreatedById = userId,
            CreatedDate = DateTime.UtcNow,
        };

        var order = 1;
        foreach (var q in request.Questions)
        {
            quiz.DailyQuizQuestions.Add(new DailyQuizQuestion
            {
                DisplayOrder = q.DisplayOrder > 0 ? q.DisplayOrder : order,
                Topic = q.Topic,
                QuestionTextEn = q.QuestionTextEn,
                OptionAen = q.OptionAEn,
                OptionBen = q.OptionBEn,
                OptionCen = q.OptionCEn,
                OptionDen = q.OptionDEn,
                CorrectOption = q.CorrectOption,
                ExplanationEn = q.ExplanationEn,
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
            });
            order++;
        }

        _db.DailyQuizzes.Add(quiz);
        await _db.SaveChangesAsync();

        return ServiceResult<DailyQuizDto>.Ok(new DailyQuizDto
        {
            Id = quiz.Id,
            QuizDate = quiz.QuizDate.ToString("yyyy-MM-dd"),
            Title = quiz.Title,
            Description = quiz.Description,
            Questions = quiz.DailyQuizQuestions
                .OrderBy(x => x.DisplayOrder)
                .Select(x => new DailyQuizQuestionDto
                {
                    Id = x.Id,
                    DisplayOrder = x.DisplayOrder,
                    Topic = x.Topic,
                    QuestionText = x.QuestionTextEn,
                    OptionA = x.OptionAen,
                    OptionB = x.OptionBen,
                    OptionC = x.OptionCen,
                    OptionD = x.OptionDen,
                })
                .ToList(),
        });
    }

    private async Task<DailyQuizAttempt?> FindAttemptAsync(int dailyQuizId, string? userId, string? guestKey)
    {
        if (!string.IsNullOrWhiteSpace(userId))
            return await _db.DailyQuizAttempts.FirstOrDefaultAsync(a => a.DailyQuizId == dailyQuizId && a.UserId == userId);
        if (!string.IsNullOrWhiteSpace(guestKey))
            return await _db.DailyQuizAttempts.FirstOrDefaultAsync(a => a.DailyQuizId == dailyQuizId && a.GuestKey == guestKey);
        return null;
    }

    private async Task<DailyQuizResultDto> BuildResultAsync(DailyQuizAttempt attempt)
    {
        var questions = await _db.DailyQuizQuestions.AsNoTracking()
            .Where(q => q.DailyQuizId == attempt.DailyQuizId)
            .OrderBy(q => q.DisplayOrder)
            .ToListAsync();
        var answers = JsonSerializer.Deserialize<Dictionary<int, string?>>(attempt.AnswersJson) ?? new();

        return new DailyQuizResultDto
        {
            AttemptId = attempt.Id,
            DailyQuizId = attempt.DailyQuizId,
            CorrectCount = attempt.CorrectCount,
            TotalQuestions = attempt.TotalQuestions,
            ScorePercent = attempt.ScorePercent,
            CompletedAt = attempt.CompletedAt,
            Questions = questions.Select(q => new DailyQuizResultQuestionDto
            {
                QuestionId = q.Id,
                QuestionText = q.QuestionTextEn,
                OptionA = q.OptionAen,
                OptionB = q.OptionBen,
                OptionC = q.OptionCen,
                OptionD = q.OptionDen,
                CorrectOption = q.CorrectOption,
                SelectedOption = answers.TryGetValue(q.Id, out var sel) ? sel : null,
                Explanation = q.ExplanationEn,
            }).ToList(),
        };
    }
}
