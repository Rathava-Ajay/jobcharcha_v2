using System.Text.Json;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

public class TestAttemptServiceTests
{
    private static async Task<(AppDbContext Db, Test Test, List<Question> Questions)> SeedTestAsync(
        string dbName, decimal marksPerQuestion = 2m, decimal negativeMarking = 0.5m, int questionCount = 4)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-1", FirstName = "Asha", LastName = "Patel", CreatedDate = DateTime.UtcNow });
        var exam = new Exam { Id = 1, Name = "SSC CGL", Slug = "ssc-cgl", CreatedDate = DateTime.UtcNow, IsActive = true };
        db.Exams.Add(exam);
        var test = new Test
        {
            Id = 1, ExamId = exam.Id, Title = "Mock Test 1", Slug = "mock-test-1", Type = 1,
            DurationMinutes = 60, NegativeMarking = negativeMarking, MarksPerQuestion = marksPerQuestion,
            TotalQuestions = questionCount, TotalMarks = questionCount * (int)marksPerQuestion,
            IsFree = true, Status = 1, CreatedDate = DateTime.UtcNow, IsActive = true,
        };
        db.Tests.Add(test);

        var questions = new List<Question>();
        for (var i = 1; i <= questionCount; i++)
        {
            var q = new Question
            {
                Id = i, ExamId = exam.Id, TestId = test.Id, Subject = "GK", Difficulty = 1,
                QuestionTextEn = $"Question {i}", OptionAen = "A", OptionBen = "B", OptionCen = "C", OptionDen = "D",
                CorrectOption = "A", Marks = marksPerQuestion, DisplayOrder = i, CreatedDate = DateTime.UtcNow, IsActive = true,
            };
            questions.Add(q);
        }
        db.Questions.AddRange(questions);
        await db.SaveChangesAsync();

        return (db, test, questions);
    }

    private static async Task<Attempt> SeedInProgressAttemptAsync(AppDbContext db, Test test, List<Question> questions, string userId = "user-1")
    {
        var now = DateTime.UtcNow;
        var attempt = new Attempt
        {
            UserId = userId,
            TestId = test.Id,
            Status = 1,
            StartedAt = now.AddMinutes(-5),
            EndsAt = now.AddMinutes(55),
            RemainingSeconds = 3300,
            QuestionOrderJson = JsonSerializer.Serialize(questions.Select(q => q.Id)),
            CreatedDate = now,
            IsActive = true,
        };
        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        db.Responses.AddRange(questions.Select(q => new Response
        {
            AttemptId = attempt.Id,
            QuestionId = q.Id,
            IsVisited = false,
            UpdatedAt = now,
        }));
        await db.SaveChangesAsync();
        return attempt;
    }

    /// <summary>Marks the given question ids as answered with the given selected option letter.</summary>
    private static async Task AnswerAsync(AppDbContext db, int attemptId, int questionId, string option)
    {
        var response = await db.Responses.FirstAsync(r => r.AttemptId == attemptId && r.QuestionId == questionId);
        response.SelectedOption = option;
        response.AnsweredAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task SubmitAsync_ComputesScore_WithNegativeMarkingForWrongAnswers()
    {
        // marksPerQuestion=2, negativeMarking=0.5; 4 questions: 2 correct, 1 wrong, 1 unanswered
        // expected score = 2*2 - 1*0.5 = 3.5
        var (db, test, questions) = await SeedTestAsync(TestDb.NewDbName());
        var attempt = await SeedInProgressAttemptAsync(db, test, questions);
        await AnswerAsync(db, attempt.Id, questions[0].Id, "A"); // correct
        await AnswerAsync(db, attempt.Id, questions[1].Id, "A"); // correct
        await AnswerAsync(db, attempt.Id, questions[2].Id, "B"); // wrong
        // questions[3] left unanswered

        var service = new TestAttemptService(db);
        var result = await service.SubmitAsync(attempt.Id, "user-1");

        Assert.True(result.Succeeded);
        Assert.Equal(3.5m, result.Data!.Score);
        Assert.Equal(2, result.Data.CorrectCount);
        Assert.Equal(1, result.Data.WrongCount);
        Assert.Equal(1, result.Data.UnansweredCount);
    }

    [Fact]
    public async Task SubmitAsync_AllCorrect_ScoresFullMarksWithNoDeduction()
    {
        var (db, test, questions) = await SeedTestAsync(TestDb.NewDbName(), marksPerQuestion: 1m, negativeMarking: 0.25m, questionCount: 3);
        var attempt = await SeedInProgressAttemptAsync(db, test, questions);
        foreach (var q in questions) await AnswerAsync(db, attempt.Id, q.Id, "A");

        var service = new TestAttemptService(db);
        var result = await service.SubmitAsync(attempt.Id, "user-1");

        Assert.True(result.Succeeded);
        Assert.Equal(3m, result.Data!.Score);
        Assert.Equal(100m, result.Data.AccuracyPercent);
    }

    [Fact]
    public async Task SubmitAsync_ComputesAllIndiaRankAndPercentile_AcrossMultipleAttempts()
    {
        var dbName = TestDb.NewDbName();
        var (db, test, questions) = await SeedTestAsync(dbName, marksPerQuestion: 1m, negativeMarking: 0m, questionCount: 4);
        db.AspNetUsers.Add(new AspNetUser { Id = "user-2", FirstName = "Ravi", LastName = "Shah", CreatedDate = DateTime.UtcNow });
        db.AspNetUsers.Add(new AspNetUser { Id = "user-3", FirstName = "Neha", LastName = "Joshi", CreatedDate = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var service = new TestAttemptService(db);

        // user-2 scores 1/4 (low), user-3 scores 4/4 (high), user-1 scores 2/4 (middle).
        var attempt2 = await SeedInProgressAttemptAsync(db, test, questions, "user-2");
        await AnswerAsync(db, attempt2.Id, questions[0].Id, "A");
        await service.SubmitAsync(attempt2.Id, "user-2");

        var attempt3 = await SeedInProgressAttemptAsync(db, test, questions, "user-3");
        foreach (var q in questions) await AnswerAsync(db, attempt3.Id, q.Id, "A");
        await service.SubmitAsync(attempt3.Id, "user-3");

        var attempt1 = await SeedInProgressAttemptAsync(db, test, questions, "user-1");
        await AnswerAsync(db, attempt1.Id, questions[0].Id, "A");
        await AnswerAsync(db, attempt1.Id, questions[1].Id, "A");
        var result1 = await service.SubmitAsync(attempt1.Id, "user-1");

        // user-1 (score 2) beats only user-2 (score 1); user-3 (score 4) is ahead — rank should be 2nd of 3.
        var analytic = await db.ResultsAnalytics.AsNoTracking().FirstAsync(r => r.AttemptId == attempt1.Id);
        Assert.Equal(2, analytic.AllIndiaRank);
        Assert.True(result1.Succeeded);
    }

    [Fact]
    public async Task SubmitAsync_AlreadySubmitted_DoesNotRecomputeScore()
    {
        var (db, test, questions) = await SeedTestAsync(TestDb.NewDbName());
        var attempt = await SeedInProgressAttemptAsync(db, test, questions);
        await AnswerAsync(db, attempt.Id, questions[0].Id, "A");

        var service = new TestAttemptService(db);
        var first = await service.SubmitAsync(attempt.Id, "user-1");

        // Answering more questions after submission should have no effect on the stored score.
        await AnswerAsync(db, attempt.Id, questions[1].Id, "A");
        var second = await service.SubmitAsync(attempt.Id, "user-1");

        Assert.Equal(first.Data!.Score, second.Data!.Score);
    }

    [Fact]
    public async Task GetResultAsync_WithoutPremiumAccess_LocksPercentileAndRank()
    {
        var (db, test, questions) = await SeedTestAsync(TestDb.NewDbName());
        var attempt = await SeedInProgressAttemptAsync(db, test, questions);
        await AnswerAsync(db, attempt.Id, questions[0].Id, "A");

        var service = new TestAttemptService(db);
        await service.SubmitAsync(attempt.Id, "user-1");
        var result = await service.GetResultAsync(attempt.Id, "user-1");

        Assert.True(result.Succeeded);
        Assert.True(result.Data!.AnalyticsLocked);
        Assert.Null(result.Data.Percentile);
        Assert.Null(result.Data.AllIndiaRank);
    }

    [Fact]
    public async Task GetResultAsync_WithPremiumAccessViaTestPurchase_UnlocksPercentileAndRank()
    {
        var (db, test, questions) = await SeedTestAsync(TestDb.NewDbName());
        db.TestPurchases.Add(new TestPurchase { UserId = "user-1", TestId = test.Id, Price = 99m, PurchasedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var attempt = await SeedInProgressAttemptAsync(db, test, questions);
        await AnswerAsync(db, attempt.Id, questions[0].Id, "A");

        var service = new TestAttemptService(db);
        await service.SubmitAsync(attempt.Id, "user-1");
        var result = await service.GetResultAsync(attempt.Id, "user-1");

        Assert.True(result.Succeeded);
        Assert.False(result.Data!.AnalyticsLocked);
        Assert.NotNull(result.Data.Percentile);
        Assert.NotNull(result.Data.AllIndiaRank);
    }
}
