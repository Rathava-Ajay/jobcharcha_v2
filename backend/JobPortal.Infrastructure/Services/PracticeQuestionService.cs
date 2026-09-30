using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.DTOs.PracticeQuestions;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class PracticeQuestionService : IPracticeQuestionService
{
    // Difficulty column convention owned by this service — no admin UI writes it yet.
    private static readonly Dictionary<int, string> DifficultyLabels = new()
    {
        [1] = "Easy",
        [2] = "Medium",
        [3] = "Hard",
    };

    private readonly AppDbContext _db;

    public PracticeQuestionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<PracticeExamOptionDto>> GetExamsAsync()
    {
        var grouped = await _db.Questions.AsNoTracking()
            .Where(q => q.IsActive)
            .GroupBy(q => new { q.ExamId, q.Exam.Name })
            .Select(g => new PracticeExamOptionDto
            {
                ExamId = g.Key.ExamId,
                ExamName = g.Key.Name,
                QuestionCount = g.Count(),
            })
            .OrderBy(e => e.ExamName)
            .ToListAsync();
        return grouped;
    }

    public async Task<List<string>> GetSubjectsAsync(int examId) =>
        await _db.Questions.AsNoTracking()
            .Where(q => q.IsActive && q.ExamId == examId)
            .Select(q => q.Subject).Distinct().OrderBy(s => s).ToListAsync();

    public async Task<List<string>> GetTopicsAsync(int examId, string? subject)
    {
        var query = _db.Questions.AsNoTracking().Where(q => q.IsActive && q.ExamId == examId && q.Topic != null);
        if (!string.IsNullOrWhiteSpace(subject)) query = query.Where(q => q.Subject == subject);
        return await query.Select(q => q.Topic!).Distinct().OrderBy(t => t).ToListAsync();
    }

    public async Task<PagedResult<PracticeQuestionDto>> SearchAsync(PracticeQuestionQuery query)
    {
        var q = _db.Questions.AsNoTracking().Include(x => x.Exam).Where(x => x.IsActive).AsQueryable();
        if (query.ExamId.HasValue) q = q.Where(x => x.ExamId == query.ExamId.Value);
        if (!string.IsNullOrWhiteSpace(query.Subject)) q = q.Where(x => x.Subject == query.Subject);
        if (!string.IsNullOrWhiteSpace(query.Topic)) q = q.Where(x => x.Topic == query.Topic);
        if (!string.IsNullOrWhiteSpace(query.Difficulty))
        {
            var difficultyValue = DifficultyLabels.FirstOrDefault(kv =>
                string.Equals(kv.Value, query.Difficulty, StringComparison.OrdinalIgnoreCase)).Key;
            if (difficultyValue != 0) q = q.Where(x => x.Difficulty == difficultyValue);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(x => EF.Functions.Like(x.QuestionTextEn, $"%{s}%"));
        }

        var totalCount = await q.CountAsync();
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var items = await q.OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<PracticeQuestionDto>
        {
            Items = items.Select(ToDto).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
        };
    }

    private static PracticeQuestionDto ToDto(Question q) => new()
    {
        Id = q.Id,
        ExamId = q.ExamId,
        ExamName = q.Exam?.Name ?? "General",
        Subject = q.Subject,
        Topic = q.Topic,
        Difficulty = DifficultyLabels.TryGetValue(q.Difficulty, out var label) ? label : "Medium",
        QuestionText = q.QuestionTextEn,
        OptionA = q.OptionAen,
        OptionB = q.OptionBen,
        OptionC = q.OptionCen,
        OptionD = q.OptionDen,
        CorrectOption = q.CorrectOption,
        Explanation = q.ExplanationEn,
        Marks = q.Marks,
    };
}
