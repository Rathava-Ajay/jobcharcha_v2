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
            new OldPaperService(db), new StudyMaterialService(db));

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
