using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Content;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPortal.Tests;

/// <summary>The admin clicks "Approve" in AI Magic: every one of the five auto-shared categories must queue Telegram, Facebook and
/// Instagram shares, and the categories that are not shared (old papers) must not.</summary>
public class SocialShareAiMagicTests
{
    private static IngestContentDraftRequest Draft(string category, object payload) => new()
    {
        Category = category, SourceName = "Test", SourceUrl = $"https://example.gov.in/{category}", Payload = JsonSerializer.SerializeToElement(payload),
    };

    private static readonly (string Category, object Payload)[] Samples =
    {
        ("job", new { title = "GSSSB Staff Nurse Recruitment 2026 - 131 Posts", department = "GSSSB", categoryId = 1, focusKeyword = "k", lastDate = "2099-12-31",
                      applyLink = "https://gsssb.gujarat.gov.in/apply/nurse", shortDescription = "s", overview = "o", howToApply = "<ol><li>x</li></ol>", metaTitle = "m", metaDescription = "md" }),
        ("result", new { title = "GPSSB Talati Result 2026", organizationName = "GPSSB", categoryId = 1, focusKeyword = "k", resultDate = "2026-09-29",
                         resultLink = "https://gpssb.gujarat.gov.in/result/talati", shortDescription = "s", description = "d", metaTitle = "m", metaDescription = "md" }),
        ("admitcard", new { title = "SSC CGL Admit Card 2026", organizationName = "SSC", categoryId = 1, focusKeyword = "k", admitCardReleaseDate = "2026-09-27",
                            downloadLink = "https://ssc.gov.in/admit/cgl", shortDescription = "s", description = "d", metaTitle = "m", metaDescription = "md" }),
        ("scheme", new { title = "Mukhyamantri Yuva Swavalamban Yojana 2026", ministry = "Education Department", category = "Education",
                         eligibility = "Gujarat students with 80% in HSC", benefits = "Tuition fee assistance", applyLink = "https://mysy.guj.nic.in" }),
        ("news", new { title = "GSSSB announces revised exam calendar", summary = "Revised dates released.", content = "<p>Details.</p>", categoryId = NewsTestData.CategoryId, source = "GSSSB", sourceLink = "https://gsssb.gujarat.gov.in/n/1" }),
    };

    [Fact]
    public async Task ApprovingADraft_QueuesAllThreeChannels_ForEachOfTheFiveCategories()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.Categories.Add(new Category { Id = 1, Name = "GSSSB", Slug = "gsssb", Icon = "x", CreatedDate = DateTime.UtcNow, IsActive = true });
        await db.SaveChangesAsync();

        var options = new SocialShareOptions { TelegramBotToken = "t", TelegramChannelId = "@c", MetaPageAccessToken = "m", MetaPageId = "p", InstagramAccountId = "i", PublicBaseUrl = "https://x.test" };
        var social = new SocialShareService(db, options, NullLogger<SocialShareService>.Instance);
        var service = new ContentDraftService(db, new ResultService(db, social), new AdmitCardService(db, social), new NewsService(db, social), new GovtSchemeService(db, social),
            new OldPaperService(db), new StudyMaterialService(db), new FakeLinkChecker(), new JobService(db, new FakeBackgroundTaskQueue(), social));

        foreach (var (category, payload) in Samples)
        {
            var ingested = await service.IngestAsync(Draft(category, payload));
            Assert.True(ingested.Succeeded, $"{category}: {ingested.Error}");
            var draftId = ingested.Data!.Draft!.Id;

            var approved = await service.ApproveAsync(draftId, new ApproveContentDraftRequest(), "admin-1");
            Assert.True(approved.Succeeded, $"{category}: {approved.Error}");

            var shares = await db.SocialShareJobs.AsNoTracking().Where(j => j.Category == category && j.EntityId == approved.Data!.CreatedEntityId).ToListAsync();
            Assert.Equal(new[] { "facebook", "instagram", "telegram" }, shares.Select(s => s.Channel).OrderBy(c => c));
            Assert.All(shares, s => Assert.Equal(SocialShareStatus.AwaitingApproval, s.Status));
            Assert.Single(shares.Select(s => s.Template).Distinct());                       // one template per post
            Assert.StartsWith($"https://x.test/{PathFor(category)}/", shares[0].Url);
        }

        // five posts -> five different templates, in order
        var order = await db.SocialShareJobs.AsNoTracking().Where(j => j.Channel == "telegram").OrderBy(j => j.Id).Select(j => j.Template).ToListAsync();
        Assert.Equal(new int?[] { 0, 1, 2, 3, 4 }, order);
    }

    [Fact]
    public async Task SkipSocialOnApprove_QueuesNothing_AndOldPapersAreNeverShared()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var options = new SocialShareOptions { TelegramBotToken = "t", TelegramChannelId = "@c", PublicBaseUrl = "https://x.test" };
        var social = new SocialShareService(db, options, NullLogger<SocialShareService>.Instance);
        var service = new ContentDraftService(db, new ResultService(db, social), new AdmitCardService(db, social), new NewsService(db, social), new GovtSchemeService(db, social),
            new OldPaperService(db), new StudyMaterialService(db), new FakeLinkChecker(), new JobService(db, new FakeBackgroundTaskQueue(), social));

        var news = await service.IngestAsync(Draft("news", Samples[4].Payload));
        await service.ApproveAsync(news.Data!.Draft!.Id, new ApproveContentDraftRequest { SkipSocial = true }, "admin-1");

        var paper = await service.IngestAsync(Draft("oldpaper", new { title = "GPSC DEO Paper 2026", examName = "GPSC DEO", year = 2026, paperPdfLink = "https://gpsc.gujarat.gov.in/q1.pdf" }));
        Assert.True(paper.Succeeded, paper.Error);
        Assert.True((await service.ApproveAsync(paper.Data!.Draft!.Id, new ApproveContentDraftRequest(), "admin-1")).Succeeded);

        Assert.Empty(await db.SocialShareJobs.ToListAsync());
    }

    private static string PathFor(string category) => category switch
    {
        "job" => "jobs", "result" => "results", "admitcard" => "admit-cards", "scheme" => "schemes", _ => "news",
    };
}
