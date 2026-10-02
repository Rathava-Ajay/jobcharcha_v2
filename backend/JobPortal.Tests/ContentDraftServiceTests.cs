using Microsoft.Extensions.Configuration;
using System.Text.Json;
using JobPortal.Application.DTOs.Content;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;

namespace JobPortal.Tests;

/// <summary>AI Magic review queue: ingest validation + dedupe, and approve/reject lifecycle.</summary>
public class ContentDraftServiceTests
{
    private static ContentDraftService Create(JobPortal.Infrastructure.Data.AppDbContext db) =>
        new(db, new ResultService(db), new AdmitCardService(db), new NewsService(db), new GovtSchemeService(db),
            new OldPaperService(db), new StudyMaterialService(db), new FakeLinkChecker());

    private static IngestContentDraftRequest News(string title = "GSSSB announces exam calendar", string? link = "https://gsssb.gujarat.gov.in/n/1") => new()
    {
        Category = "news",
        SourceName = "GSSSB",
        SourceUrl = link,
        Payload = JsonSerializer.SerializeToElement(new
        {
            title,
            summary = "GSSSB has released its exam calendar.",
            content = "<p>GSSSB has released the exam calendar for the year.</p>",
            source = "GSSSB",
            sourceLink = link,
        }),
    };

    [Fact]
    public async Task Ingest_NewItem_CreatesPendingDraft_AndRepeatIsSkipped()
    {
        var service = Create(TestDb.Create(TestDb.NewDbName()));

        var first = await service.IngestAsync(News());
        Assert.True(first.Succeeded);
        Assert.Equal(ContentIngestOutcome.Created, first.Data!.Outcome);

        var again = await service.IngestAsync(News());
        Assert.Equal(ContentIngestOutcome.SkippedPending, again.Data!.Outcome);

        var pending = await service.SearchAsync("news", ContentDraftStatus.Pending);
        Assert.Single(pending.Items);
    }

    [Fact]
    public async Task Ingest_InvalidPayload_IsRejectedWithMessage()
    {
        var service = Create(TestDb.Create(TestDb.NewDbName()));

        var result = await service.IngestAsync(new IngestContentDraftRequest
        {
            Category = "news",
            SourceName = "x",
            Payload = JsonSerializer.SerializeToElement(new { title = "No body here" }),
        });

        Assert.False(result.Succeeded);
        Assert.Equal("InvalidPayload", result.ErrorCode);
    }

    [Fact]
    public async Task Ingest_UnknownCategory_Fails()
    {
        var service = Create(TestDb.Create(TestDb.NewDbName()));
        var req = News();
        req.Category = "jobs";
        var result = await service.IngestAsync(req);
        Assert.False(result.Succeeded);
        Assert.Equal("InvalidCategory", result.ErrorCode);
    }

    [Fact]
    public async Task Ingest_AlreadyPublishedTitle_IsSkipped()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = Create(db);

        var created = await service.IngestAsync(News("Exam calendar released"));
        var approved = await service.ApproveAsync(created.Data!.Draft!.Id, new ApproveContentDraftRequest(), "admin-1");
        Assert.True(approved.Succeeded);

        // Same headline arriving from a different link: already live, so nothing left to review.
        var dup = await service.IngestAsync(News("Exam calendar released", "https://other.example/news"));
        Assert.Equal(ContentIngestOutcome.SkippedPublished, dup.Data!.Outcome);
    }

    [Fact]
    public async Task Approve_PublishesAndMarksApproved_ThenCannotBeReviewedAgain()
    {
        var service = Create(TestDb.Create(TestDb.NewDbName()));
        var draftId = (await service.IngestAsync(News())).Data!.Draft!.Id;

        var approved = await service.ApproveAsync(draftId, new ApproveContentDraftRequest(), "admin-1");
        Assert.True(approved.Succeeded);
        Assert.True(approved.Data!.CreatedEntityId > 0);

        var draft = await service.GetByIdAsync(draftId);
        Assert.Equal(ContentDraftStatus.Approved, draft!.Status);
        Assert.Equal(approved.Data.CreatedEntityId, draft.CreatedEntityId);

        var second = await service.ApproveAsync(draftId, new ApproveContentDraftRequest(), "admin-1");
        Assert.Equal("AlreadyReviewed", second.ErrorCode);
    }

    [Fact]
    public async Task Approve_UsesAdminEditedPayload()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = Create(db);
        var draftId = (await service.IngestAsync(News())).Data!.Draft!.Id;

        var edited = JsonSerializer.SerializeToElement(new
        {
            title = "Edited headline by admin",
            summary = "Edited summary.",
            content = "<p>Edited body.</p>",
        });
        var approved = await service.ApproveAsync(draftId, new ApproveContentDraftRequest { Payload = edited }, "admin-1");
        Assert.True(approved.Succeeded);

        var news = await new NewsService(db).GetByIdAsync(approved.Data!.CreatedEntityId);
        Assert.Equal("Edited headline by admin", news!.Title);
    }

    [Fact]
    public async Task Reject_KeepsRowSoReScrapeIsSkippedAsReviewed()
    {
        var service = Create(TestDb.Create(TestDb.NewDbName()));
        var draftId = (await service.IngestAsync(News())).Data!.Draft!.Id;

        Assert.True((await service.RejectAsync(draftId, new RejectContentDraftRequest { ReviewNotes = "Not relevant" }, "admin-1")).Succeeded);

        var again = await service.IngestAsync(News());
        Assert.Equal(ContentIngestOutcome.SkippedReviewed, again.Data!.Outcome);
    }

    [Fact]
    public async Task Summary_CountsPendingPerCategory()
    {
        var service = Create(TestDb.Create(TestDb.NewDbName()));
        await service.IngestAsync(News());

        var summary = await service.GetSummaryAsync();
        Assert.Equal(ContentCategories.All.Length, summary.Count);
        Assert.Equal(1, summary.Single(s => s.Category == "news").PendingCount);
        Assert.Equal(0, summary.Single(s => s.Category == "result").PendingCount);
    }
}

public class ContentSyncParsingTests
{
    private static string Cli(string result) => System.Text.Json.JsonSerializer.Serialize(new { result });

    [Fact]
    public void ParseAgentItems_ReadsItemsEvenWhenWrappedInProse()
    {
        var answer = "Here you go:\n```json\n{ \"items\": [ { \"sourceName\": \"PIB\", \"sourceUrl\": \"https://pib.gov.in/x\", \"payload\": { \"title\": \"T\" } } ] }\n```";
        var (items, error) = ContentSyncService.ParseAgentItems(Cli(answer));

        Assert.Null(error);
        Assert.Single(items);
        Assert.Equal("PIB", items[0].SourceName);
    }

    [Fact]
    public void ParseAgentItems_EmptyList_IsNotAnError()
    {
        var (items, error) = ContentSyncService.ParseAgentItems(Cli("{ \"items\": [] }"));
        Assert.Null(error);
        Assert.Empty(items);
    }

    [Fact]
    public void ParseAgentItems_ProseOnly_ReportsWhatTheAgentSaid()
    {
        var (items, error) = ContentSyncService.ParseAgentItems(Cli("I could not reach any site."));
        Assert.Empty(items);
        Assert.Contains("could not reach", error);
    }
}

public class ContentSlugTests
{
    [Fact]
    public void CleanSlug_StripsPunctuationAndCapsLength()
    {
        Assert.Equal("gpsc-opens-26-class-1-2-posts-apply-by-8-october-2026",
            ContentDraftService.CleanSlug("GPSC Opens 26 Class 1-2 Posts; Apply by 8 October 2026"));
        Assert.True(ContentDraftService.CleanSlug(new string('a', 40) + " " + new string('b', 90)).Length <= 100);
    }

    [Fact]
    public void WithCleanSlug_KeepsAnExistingSlug_AndAddsOneWhenMissing()
    {
        Assert.Contains("\"slug\":\"my-slug\"", ContentDraftService.WithCleanSlug("{\"title\":\"X\",\"slug\":\"my-slug\"}"));
        Assert.Contains("\"slug\":\"hello-world\"", ContentDraftService.WithCleanSlug("{\"title\":\"Hello: World!\"}"));
    }
}

public class ContentLinkGuardTests
{
    private static ContentDraftService Create(JobPortal.Infrastructure.Data.AppDbContext db) =>
        new(db, new ResultService(db), new AdmitCardService(db), new NewsService(db), new GovtSchemeService(db),
            new OldPaperService(db), new StudyMaterialService(db), new FakeLinkChecker());

    private static IngestContentDraftRequest AdmitCard(string? downloadLink) => new()
    {
        Category = "admitcard", SourceName = "SSC",
        Payload = JsonSerializer.SerializeToElement(new
        {
            title = "SSC CGL Admit Card 2026", organizationName = "SSC", categoryId = 1, focusKeyword = "SSC CGL Admit Card 2026",
            admitCardReleaseDate = "2026-09-27", downloadLink, shortDescription = "s", description = "d",
            metaTitle = "m", metaDescription = "md",
        }),
    };

    private static IngestContentDraftRequest OldPaper(string paper, string? solution) => new()
    {
        Category = "oldpaper", SourceName = "GPSC",
        Payload = JsonSerializer.SerializeToElement(new
        {
            title = "GPSC DEO Question Paper 2026", examName = "GPSC DEO", year = 2026, paperPdfLink = paper, solutionPdfLink = solution,
        }),
    };

    [Theory]
    [InlineData("https://ssc.gov.in")]
    [InlineData("https://ssc.gov.in/")]
    [InlineData("not a url")]
    public async Task AdmitCard_WithHomePageLink_IsRejected(string link)
    {
        var result = await Create(TestDb.Create(TestDb.NewDbName())).IngestAsync(AdmitCard(link));
        Assert.False(result.Succeeded);
        Assert.Contains("deep link", result.Error);
    }

    [Fact]
    public async Task AdmitCard_WithDeepLink_IsAccepted()
    {
        var result = await Create(TestDb.Create(TestDb.NewDbName())).IngestAsync(AdmitCard("https://ssc.gov.in/notice/cgl-admit-card"));
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task OldPaper_SamePdfForPaperAndSolution_IsRejected()
    {
        var url = "https://gpsc.gujarat.gov.in/docs/PAK-41.pdf";
        var result = await Create(TestDb.Create(TestDb.NewDbName())).IngestAsync(OldPaper(url, url));
        Assert.False(result.Succeeded);
        Assert.Contains("different PDF", result.Error);
    }

    [Fact]
    public async Task OldPaper_DistinctPdfsOrNoSolution_AreAccepted()
    {
        var service = Create(TestDb.Create(TestDb.NewDbName()));
        Assert.True((await service.IngestAsync(OldPaper("https://x.gov.in/q.pdf", "https://x.gov.in/a.pdf"))).Succeeded);
        var other = OldPaper("https://x.gov.in/q2.pdf", null);
        other.Payload = JsonSerializer.SerializeToElement(new { title = "Another paper 2025", examName = "Other exam", year = 2025, paperPdfLink = "https://x.gov.in/q2.pdf" });
        Assert.True((await service.IngestAsync(other)).Succeeded);
    }
}

public class ContentSettingsTests
{
    private static Microsoft.Extensions.Configuration.IConfiguration Config(int max = 10, int days = 7) =>
        new Microsoft.Extensions.Configuration.ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ContentSync:MaxItemsPerRun"] = max.ToString(), ["ContentSync:FreshnessDays"] = days.ToString(),
        }).Build();

    [Fact]
    public async Task GetAll_ReturnsEveryCategory_WithConfigDefaultsUntilSaved()
    {
        var service = new ContentSettingsService(TestDb.Create(TestDb.NewDbName()), Config(max: 12, days: 5));
        var all = await service.GetAllAsync();

        Assert.Equal(ContentCategories.All.Length, all.Count);
        Assert.All(all, s => { Assert.True(s.IsEnabled); Assert.False(s.IsCustomized); Assert.Equal(12, s.MaxItemsPerRun); Assert.Equal(5, s.FreshnessDays); });
    }

    [Fact]
    public async Task Update_SavesOverrides_AndLeavesOtherCategoriesOnDefaults()
    {
        var service = new ContentSettingsService(TestDb.Create(TestDb.NewDbName()), Config());
        var saved = await service.UpdateAsync("News", new UpdateContentCategorySettingRequest
        {
            IsEnabled = false, MaxItemsPerRun = 3, FreshnessDays = 2, ExtraInstructions = "  Gujarat only  ",
        });

        Assert.True(saved.Succeeded);
        var all = await service.GetAllAsync();
        var news = all.Single(s => s.Category == "news");
        Assert.False(news.IsEnabled);
        Assert.Equal(3, news.MaxItemsPerRun);
        Assert.Equal("Gujarat only", news.ExtraInstructions);
        Assert.True(news.IsCustomized);
        Assert.False(all.Single(s => s.Category == "result").IsCustomized);
    }

    [Theory]
    [InlineData("jobs", 10, 7)]
    [InlineData("news", 0, 7)]
    [InlineData("news", 31, 7)]
    [InlineData("news", 10, 0)]
    [InlineData("news", 10, 400)]
    public async Task Update_RejectsUnknownCategoryAndOutOfRangeValues(string category, int max, int days)
    {
        var service = new ContentSettingsService(TestDb.Create(TestDb.NewDbName()), Config());
        var result = await service.UpdateAsync(category, new UpdateContentCategorySettingRequest { MaxItemsPerRun = max, FreshnessDays = days });
        Assert.False(result.Succeeded);
    }

    private static List<ContentCategorySettingDto> Settings(params string[] disabled) =>
        ContentCategories.All.Select(c => new ContentCategorySettingDto { Category = c, IsEnabled = !disabled.Contains(c) }).ToList();

    [Fact]
    public void ResolveCategories_All_SkipsDisabled()
    {
        var (run, error) = ContentSyncService.ResolveCategories(null, Settings("news", "study"));
        Assert.Null(error);
        Assert.DoesNotContain("news", run);
        Assert.DoesNotContain("study", run);
        Assert.Equal(ContentCategories.All.Length - 2, run.Count);
    }

    [Fact]
    public void ResolveCategories_NamedButDisabled_IsAnError()
    {
        var (_, error) = ContentSyncService.ResolveCategories("news", Settings("news"));
        Assert.Equal("CategoryDisabled", error!.Value.Code);
    }

    [Fact]
    public void ResolveCategories_AllDisabled_IsAnError()
    {
        var (_, error) = ContentSyncService.ResolveCategories("", Settings(ContentCategories.All));
        Assert.Equal("AllDisabled", error!.Value.Code);
    }

    [Fact]
    public void ResolveCategories_UnknownName_IsAnError()
    {
        var (_, error) = ContentSyncService.ResolveCategories("jobs", Settings());
        Assert.Equal("InvalidCategory", error!.Value.Code);
    }
}

/// <summary>Link checker that never touches the network: URLs containing "dead" report a problem.</summary>
public class FakeLinkChecker : JobPortal.Application.Interfaces.IContentLinkChecker
{
    public List<string> Checked { get; } = new();

    public Task<string?> CheckAsync(string url)
    {
        Checked.Add(url);
        return Task.FromResult<string?>(url.Contains("dead") ? "returned HTTP 404" : null);
    }
}

public class ContentPhase3Tests
{
    private static (ContentDraftService Service, FakeLinkChecker Links) Create()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var links = new FakeLinkChecker();
        var service = new ContentDraftService(db, new ResultService(db), new AdmitCardService(db), new NewsService(db),
            new GovtSchemeService(db), new OldPaperService(db), new StudyMaterialService(db), links);
        return (service, links);
    }

    private static IngestContentDraftRequest Result(string title, string? link, string? pdf) => new()
    {
        Category = "result", SourceName = "GPSSB",
        Payload = JsonSerializer.SerializeToElement(new
        {
            title, organizationName = "GPSSB", categoryId = 1, focusKeyword = "k", resultDate = "2026-09-29",
            resultLink = link, resultPdf = pdf, shortDescription = "s", description = "d", metaTitle = "m", metaDescription = "md",
        }),
    };

    [Fact]
    public async Task Result_WithOnlyAHomePage_IsRejected()
    {
        var (service, _) = Create();
        var r = await service.IngestAsync(Result("RBI Result 2026", "https://www.rbi.org.in", null));
        Assert.False(r.Succeeded);
        Assert.Contains("deep link", r.Error);
    }

    [Fact]
    public async Task Result_WithNoLinkAtAll_IsRejected()
    {
        var (service, _) = Create();
        var r = await service.IngestAsync(Result("RBI Result 2026", null, null));
        Assert.False(r.Succeeded);
        Assert.Contains("resultLink or resultPdf", r.Error);
    }

    [Fact]
    public async Task Result_SameOfficialPdfUnderADifferentTitle_IsADuplicate()
    {
        var (service, _) = Create();
        var pdf = "https://gpssb.gujarat.gov.in/files/allotment.pdf";
        Assert.Equal(ContentIngestOutcome.Created, (await service.IngestAsync(Result("GPSSB Gram Sevak Result 2026", null, pdf))).Data!.Outcome);

        var again = await service.IngestAsync(Result("GPSSB Gram Sevak PwBD Special Drive Result", null, pdf.ToUpperInvariant() + "/"));
        Assert.Equal(ContentIngestOutcome.SkippedPending, again.Data!.Outcome);
    }

    [Fact]
    public async Task OldPaper_SamePdfUnderADifferentTitle_IsADuplicate()
    {
        var (service, _) = Create();
        IngestContentDraftRequest Paper(string title) => new()
        {
            Category = "oldpaper", SourceName = "GPSC",
            Payload = JsonSerializer.SerializeToElement(new { title, examName = "GPSC DEO", year = 2026, paperPdfLink = "https://gpsc.gujarat.gov.in/q1.pdf" }),
        };
        Assert.Equal(ContentIngestOutcome.Created, (await service.IngestAsync(Paper("GPSC DEO Question Paper 2026"))).Data!.Outcome);
        Assert.Equal(ContentIngestOutcome.SkippedPending, (await service.IngestAsync(Paper("District Education Officer Paper 2026 (Prelims)"))).Data!.Outcome);
    }

    [Fact]
    public async Task DeadLinks_BecomeWarningsOnTheDraft_ButDoNotBlockIt()
    {
        var (service, _) = Create();
        var result = await service.IngestAsync(Result("GPSSB Result 2026", "https://gpssb.gujarat.gov.in/dead/page", "https://gpssb.gujarat.gov.in/ok.pdf"));

        Assert.True(result.Succeeded);
        Assert.Equal(ContentIngestOutcome.Created, result.Data!.Outcome);
        var draft = await service.GetByIdAsync(result.Data.Draft!.Id);
        Assert.Single(draft!.Warnings);
        Assert.Equal("resultLink returned HTTP 404", draft.Warnings[0]);
    }

    [Fact]
    public async Task CleanDraft_HasNoWarnings_AndEachDistinctLinkIsCheckedOnce()
    {
        var (service, links) = Create();
        var url = "https://gpssb.gujarat.gov.in/ok.pdf";
        var req = Result("GPSSB Result 2026", url, url);
        req.SourceUrl = url;
        var result = await service.IngestAsync(req);

        Assert.Empty((await service.GetByIdAsync(result.Data!.Draft!.Id))!.Warnings);
        Assert.Single(links.Checked);
    }

    [Fact]
    public async Task SkippedDuplicates_DoNotTriggerLinkChecks()
    {
        var (service, links) = Create();
        await service.IngestAsync(Result("GPSSB Result 2026", null, "https://x.gov.in/a.pdf"));
        var before = links.Checked.Count;
        await service.IngestAsync(Result("Renamed Result", null, "https://x.gov.in/a.pdf"));
        Assert.Equal(before, links.Checked.Count);
    }

    [Theory]
    [InlineData("10.0.0.5", false)]
    [InlineData("127.0.0.1", false)]
    [InlineData("192.168.1.10", false)]
    [InlineData("172.16.0.1", false)]
    [InlineData("169.254.169.254", false)]
    [InlineData("100.64.0.1", false)]
    [InlineData("::1", false)]
    [InlineData("fd00::1", false)]
    [InlineData("8.8.8.8", true)]
    [InlineData("172.32.0.1", true)]
    public void LinkChecker_OnlyAllowsPublicAddresses(string ip, bool expected) =>
        Assert.Equal(expected, ContentLinkChecker.IsPublic(System.Net.IPAddress.Parse(ip)));
}
