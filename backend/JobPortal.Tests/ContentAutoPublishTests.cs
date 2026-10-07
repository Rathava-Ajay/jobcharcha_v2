using System.Text.Json;
using JobPortal.Application.DTOs.Content;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Tests;

/// <summary>AI Magic phase 6: auto-publish is opt-in, limited to cheap-mistake categories, and traceable.</summary>
public class ContentAutoPublishTests
{
    private static IConfiguration Config() => new ConfigurationBuilder().AddInMemoryCollection().Build();

    private static ContentDraftService Create(AppDbContext db) =>
        new(db, new ResultService(db), new AdmitCardService(db), new NewsService(db), new GovtSchemeService(db),
            new OldPaperService(db), new StudyMaterialService(db), new FakeLinkChecker(), new JobService(db, new FakeBackgroundTaskQueue()));

    private static IngestContentDraftRequest News(string link = "https://gsssb.gujarat.gov.in/n/1") => new()
    {
        Category = "news",
        SourceName = "GSSSB",
        SourceUrl = link,
        Payload = JsonSerializer.SerializeToElement(new
        {
            title = "GSSSB announces exam calendar",
            summary = "GSSSB has released its exam calendar.",
            content = "<p>GSSSB has released the exam calendar for the year.</p>",
            categoryId = NewsTestData.CategoryId,
            source = "GSSSB",
            sourceLink = link,
        }),
    };
    [Theory]
    [InlineData("job")]
    [InlineData("result")]
    [InlineData("admitcard")]
    [InlineData("oldpaper")]
    [InlineData("scheme")]
    public async Task AutoPublish_IsRejected_ForCategoriesThatNeedAHumanCheck(string category)
    {
        var service = new ContentSettingsService(TestDb.Create(TestDb.NewDbName()), Config());
        var result = await service.UpdateAsync(category, new UpdateContentCategorySettingRequest { AutoPublish = true }, "admin-1");
        Assert.False(result.Succeeded);
        Assert.Equal("AutoPublishNotAllowed", result.ErrorCode);
    }

    [Fact]
    public async Task AutoPublish_RequiresASignedInAdmin_AndIsOffByDefault()
    {
        var service = new ContentSettingsService(TestDb.Create(TestDb.NewDbName()), Config());
        Assert.All(await service.GetAllAsync(), s => Assert.False(s.AutoPublish));
        Assert.False((await service.UpdateAsync("news", new UpdateContentCategorySettingRequest { AutoPublish = true })).Succeeded);

        var ok = await service.UpdateAsync("news", new UpdateContentCategorySettingRequest { AutoPublish = true }, "admin-1");
        Assert.True(ok.Succeeded);
        Assert.True(ok.Data!.AutoPublish);
    }

    [Fact]
    public async Task Ingest_PublishesNewsImmediately_WhenAutoPublishIsOn_AndMarksTheDraft()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        await new ContentSettingsService(db, Config()).UpdateAsync("news", new UpdateContentCategorySettingRequest { AutoPublish = true }, "admin-1");
        var service = Create(db);

        var r = await service.IngestAsync(News());

        Assert.Equal(ContentDraftStatus.Approved, r.Data!.Draft!.Status);
        Assert.True(r.Data.Draft.AutoPublished);
        var draft = await service.GetByIdAsync(r.Data.Draft.Id);
        Assert.NotNull(draft!.CreatedEntityId);
        Assert.Equal("https://gsssb.gujarat.gov.in/n/1", draft.SourceUrl);
    }

    [Fact]
    public async Task Ingest_StaysPending_WhenAutoPublishIsOff()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = Create(db);
        var off = await service.IngestAsync(News());
        Assert.Equal(ContentDraftStatus.Pending, off.Data!.Draft!.Status);
        Assert.False(off.Data.Draft.AutoPublished);
    }
}

public class ContentSyncScopeTests
{
    [Theory]
    [InlineData(null, "all")]
    [InlineData("", "all")]
    [InlineData(" Gujarat ", "gujarat")]
    public void NormalizeScope_DefaultsToAll_AndLowercases(string? input, string expected) =>
        Assert.Equal(expected, JobPortal.Application.DTOs.Content.ContentCategories.NormalizeScope(input));

    [Fact]
    public void GujaratScope_PromptTellsTheAgentToSkipOtherStates() =>
        Assert.Contains("GUJARAT ONLY", JobPortal.Infrastructure.Services.ContentSyncService.GujaratScopeInstructions);
}
