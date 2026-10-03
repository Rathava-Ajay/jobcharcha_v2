using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPortal.Tests;

/// <summary>Auto-share step 6: the worker posts due shares once, retries with backoff, isolates channel failures,
/// falls back when the image fails, and honours the approval flow.</summary>
public class SocialShareProcessorTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 10, 3, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
        public void Advance(TimeSpan by) => Now += by;
    }

    private sealed class FakeChannel : ISocialChannel
    {
        public FakeChannel(string channel) => Channel = channel;
        public string Channel { get; }
        public int Calls { get; private set; }
        public Queue<Exception?> Script { get; } = new();    // null => succeed
        public List<string?> Images { get; } = new();
        public List<string?> Messages { get; } = new();

        public Task<string> PostAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct)
        {
            Calls++;
            Images.Add(job.ImageUrl);
            Messages.Add(job.Message);
            if (Script.Count > 0 && Script.Dequeue() is { } ex) throw ex;
            return Task.FromResult($"{Channel}-ext-{Calls}");
        }
    }

    private sealed class FakeImages : ISocialImageService
    {
        public int Calls { get; private set; }
        public bool Fail { get; set; }

        public Task<string?> EnsureImageAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default)
        {
            Calls++;
            if (Fail) return Task.FromResult<string?>(null);
            job.ImageUrl ??= "https://x.test/uploads/social/1.jpg";
            return Task.FromResult<string?>(job.ImageUrl);
        }
    }

    private sealed class Rig
    {
        public required AppDbContext Db { get; init; }
        public required Clock Clock { get; init; }
        public required FakeChannel Telegram { get; init; }
        public required FakeChannel Facebook { get; init; }
        public required FakeChannel Instagram { get; init; }
        public required FakeImages Images { get; init; }
        public required SocialShareProcessor Processor { get; init; }
        public required SocialShareOptions Options { get; init; }
    }

    private static Rig Create(SocialShareOptions? options = null)
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var clock = new Clock();
        var opts = options ?? new SocialShareOptions
        {
            TelegramBotToken = "t", TelegramChannelId = "@c", MetaPageAccessToken = "m", MetaPageId = "p", InstagramAccountId = "i",
            MaxAttempts = 4, BaseBackoffSeconds = 60, PublicBaseUrl = "https://x.test",
        };
        var tg = new FakeChannel("telegram");
        var fb = new FakeChannel("facebook");
        var ig = new FakeChannel("instagram");
        var images = new FakeImages();
        return new Rig
        {
            Db = db, Clock = clock, Telegram = tg, Facebook = fb, Instagram = ig, Images = images, Options = opts,
            Processor = new SocialShareProcessor(db, new ISocialChannel[] { tg, fb, ig }, images, opts, clock, NullLogger<SocialShareProcessor>.Instance),
        };
    }

    private static async Task<SocialShareJob> Add(Rig r, string channel = "telegram", int status = SocialShareStatus.Pending, int entity = 1)
    {
        var job = new SocialShareJob
        {
            Category = "job", EntityId = entity, Channel = channel, Status = status, Title = "Clerk", Url = "https://x.test/jobs/a",
            DetailsJson = "[{\"label\":\"Last date\",\"value\":\"15 Oct 2026\"}]",
            NextAttemptAt = status == SocialShareStatus.Pending ? r.Clock.Now.UtcDateTime : null,
            CreatedDate = r.Clock.Now.UtcDateTime, UpdatedDate = r.Clock.Now.UtcDateTime,
        };
        r.Db.SocialShareJobs.Add(job);
        await r.Db.SaveChangesAsync();
        return job;
    }

    private static Task<SocialShareJob> Reload(Rig r, int id) => r.Db.SocialShareJobs.AsNoTracking().SingleAsync(j => j.Id == id);

    // ---- posting & idempotency --------------------------------------------------------------------

    [Fact]
    public async Task DueShare_IsPostedOnce_WithImageMessageAndExternalIdStored()
    {
        var r = Create();
        var job = await Add(r);

        Assert.Equal(1, await r.Processor.RunOnceAsync());
        var saved = await Reload(r, job.Id);

        Assert.Equal(SocialShareStatus.Posted, saved.Status);
        Assert.Equal("telegram-ext-1", saved.ExternalId);
        Assert.NotNull(saved.PostedAt);
        Assert.Equal("https://x.test/uploads/social/1.jpg", r.Telegram.Images.Single());
        Assert.Contains("Clerk", r.Telegram.Messages.Single());

        // A second pass finds nothing to do, and the channel is never called again.
        Assert.Equal(0, await r.Processor.RunOnceAsync());
        Assert.Equal(1, r.Telegram.Calls);
    }

    [Fact]
    public async Task ShareThatAlreadyHasAnExternalId_IsNeverPostedAgain()
    {
        var r = Create();
        var job = await Add(r);
        job.ExternalId = "already-there";
        await r.Db.SaveChangesAsync();

        await r.Processor.RunOnceAsync();

        Assert.Equal(0, r.Telegram.Calls);
        Assert.Equal(SocialShareStatus.Posted, (await Reload(r, job.Id)).Status);
    }

    [Fact]
    public async Task SharesNotYetDue_AndOtherStates_AreLeftAlone()
    {
        var r = Create();
        var later = await Add(r);
        later.NextAttemptAt = r.Clock.Now.UtcDateTime.AddMinutes(5);
        var failed = await Add(r, "facebook", SocialShareStatus.Failed, entity: 2);
        await r.Db.SaveChangesAsync();

        Assert.Equal(0, await r.Processor.RunOnceAsync());
        Assert.Equal(0, r.Telegram.Calls + r.Facebook.Calls);
    }

    [Fact]
    public async Task ChannelWithoutCredentialsOnThisServer_LeavesTheShareQueued()
    {
        var r = Create(new SocialShareOptions { TelegramBotToken = "t", TelegramChannelId = "@c" });   // no Meta
        var ig = await Add(r, "instagram");

        await r.Processor.RunOnceAsync();

        Assert.Equal(0, r.Instagram.Calls);
        var saved = await Reload(r, ig.Id);
        Assert.Equal(SocialShareStatus.Pending, saved.Status);   // not clobbered: another server can still post it
        Assert.Equal(0, saved.Attempts);
    }

    // ---- retry with exponential backoff ----------------------------------------------------------

    [Fact]
    public void Backoff_DoublesEachAttempt_AndIsCappedAtAnHour()
    {
        Assert.Equal(TimeSpan.FromSeconds(60), SocialShareProcessor.Backoff(1, 60));
        Assert.Equal(TimeSpan.FromSeconds(120), SocialShareProcessor.Backoff(2, 60));
        Assert.Equal(TimeSpan.FromSeconds(240), SocialShareProcessor.Backoff(3, 60));
        Assert.Equal(TimeSpan.FromHours(1), SocialShareProcessor.Backoff(12, 60));
    }

    [Fact]
    public async Task RetryableFailure_IsRescheduledWithBackoff_ThenSucceeds()
    {
        var r = Create();
        var job = await Add(r);
        r.Telegram.Script.Enqueue(new SocialShareException("Could not reach Telegram", retryable: true));
        r.Telegram.Script.Enqueue(new SocialShareException("Could not reach Telegram", retryable: true));

        await r.Processor.RunOnceAsync();
        var first = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.Pending, first.Status);
        Assert.Equal(1, first.Attempts);
        Assert.Equal(r.Clock.Now.UtcDateTime.AddSeconds(60), first.NextAttemptAt);
        Assert.Contains("Could not reach", first.Error);

        // Not due yet: nothing happens.
        Assert.Equal(0, await r.Processor.RunOnceAsync());

        r.Clock.Advance(TimeSpan.FromSeconds(61));
        await r.Processor.RunOnceAsync();
        var second = await Reload(r, job.Id);
        Assert.Equal(2, second.Attempts);
        Assert.Equal(r.Clock.Now.UtcDateTime.AddSeconds(120), second.NextAttemptAt);   // doubled

        r.Clock.Advance(TimeSpan.FromSeconds(121));
        await r.Processor.RunOnceAsync();
        var done = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.Posted, done.Status);
        Assert.Equal(3, done.Attempts);
        Assert.Null(done.Error);
        Assert.Equal(3, r.Telegram.Calls);
    }

    [Fact]
    public async Task RetryableFailure_GivesUpAfterMaxAttempts()
    {
        var r = Create();
        var job = await Add(r);
        for (var i = 0; i < 10; i++) r.Telegram.Script.Enqueue(new SocialShareException("Meta is down", retryable: true));

        for (var i = 0; i < 4; i++)
        {
            await r.Processor.RunOnceAsync();
            r.Clock.Advance(TimeSpan.FromHours(2));
        }

        var saved = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.Failed, saved.Status);
        Assert.Equal(4, saved.Attempts);
        Assert.Null(saved.NextAttemptAt);
        Assert.Equal(4, r.Telegram.Calls);

        r.Clock.Advance(TimeSpan.FromDays(1));
        Assert.Equal(0, await r.Processor.RunOnceAsync());   // failed shares are not retried automatically
        Assert.Equal(4, r.Telegram.Calls);
    }

    [Fact]
    public async Task PermanentFailure_FailsImmediately_WithoutRetrying()
    {
        var r = Create();
        var job = await Add(r);
        r.Telegram.Script.Enqueue(new SocialShareException("chat not found", retryable: false));

        await r.Processor.RunOnceAsync();

        var saved = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.Failed, saved.Status);
        Assert.Equal(1, saved.Attempts);
        Assert.Equal("chat not found", saved.Error);
    }

    [Fact]
    public async Task ServerRetryAfter_IsHonouredWhenLongerThanTheBackoff()
    {
        var r = Create();
        var job = await Add(r);
        r.Telegram.Script.Enqueue(new SocialShareException("Too Many Requests", true, TimeSpan.FromMinutes(10)));

        await r.Processor.RunOnceAsync();

        Assert.Equal(r.Clock.Now.UtcDateTime.AddMinutes(10), (await Reload(r, job.Id)).NextAttemptAt);
    }

    [Fact]
    public async Task UnexpectedException_IsTreatedAsRetryable()
    {
        var r = Create();
        var job = await Add(r);
        r.Telegram.Script.Enqueue(new InvalidOperationException("kaboom"));

        await r.Processor.RunOnceAsync();

        var saved = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.Pending, saved.Status);
        Assert.Contains("kaboom", saved.Error);
    }

    // ---- isolation & fallbacks -------------------------------------------------------------------

    [Fact]
    public async Task OneChannelFailing_DoesNotBlockTheOthers()
    {
        var r = Create();
        var tg = await Add(r, "telegram");
        var fb = await Add(r, "facebook");
        var ig = await Add(r, "instagram");
        r.Facebook.Script.Enqueue(new SocialShareException("Facebook down", retryable: false));

        await r.Processor.RunOnceAsync();

        Assert.Equal(SocialShareStatus.Posted, (await Reload(r, tg.Id)).Status);
        Assert.Equal(SocialShareStatus.Failed, (await Reload(r, fb.Id)).Status);
        Assert.Equal(SocialShareStatus.Posted, (await Reload(r, ig.Id)).Status);
    }

    [Fact]
    public async Task ImageFailure_StillPostsText_ToTelegram()
    {
        var r = Create();
        r.Images.Fail = true;
        var job = await Add(r);

        await r.Processor.RunOnceAsync();

        Assert.Equal(SocialShareStatus.Posted, (await Reload(r, job.Id)).Status);
        Assert.Null(r.Telegram.Images.Single());            // channel received no image => sends sendMessage
        Assert.False(string.IsNullOrWhiteSpace(r.Telegram.Messages.Single()));
    }

    // ---- crash recovery ---------------------------------------------------------------------------

    [Fact]
    public async Task ShareStuckInProcessing_IsRequeuedAndPosted()
    {
        var r = Create();
        var job = await Add(r, status: SocialShareStatus.Processing);
        r.Clock.Advance(TimeSpan.FromMinutes(20));

        await r.Processor.RunOnceAsync();

        Assert.Equal(SocialShareStatus.Posted, (await Reload(r, job.Id)).Status);
    }

    [Fact]
    public async Task RecentProcessingShare_IsLeftAlone()
    {
        var r = Create();
        var job = await Add(r, status: SocialShareStatus.Processing);
        r.Clock.Advance(TimeSpan.FromMinutes(2));

        await r.Processor.RunOnceAsync();

        Assert.Equal(SocialShareStatus.Processing, (await Reload(r, job.Id)).Status);
        Assert.Equal(0, r.Telegram.Calls);
    }

    // ---- approval mode ---------------------------------------------------------------------------

    private static SocialShareService Admin(Rig r) => new(r.Db, r.Options, NullLogger<SocialShareService>.Instance, r.Clock);

    [Fact]
    public async Task AwaitingApproval_GetsAPreviewButIsNotPosted_UntilApproved()
    {
        var r = Create();
        var job = await Add(r, status: SocialShareStatus.AwaitingApproval);

        await r.Processor.RunOnceAsync();
        var preview = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.AwaitingApproval, preview.Status);
        Assert.NotNull(preview.ImageUrl);
        Assert.Contains("Clerk", preview.Message);
        Assert.Equal(0, r.Telegram.Calls);

        // Preview is built once, not on every pass.
        await r.Processor.RunOnceAsync();
        Assert.Equal(1, r.Images.Calls);

        Assert.True((await Admin(r).ApproveAsync(job.Id, "Edited by admin", "admin-1")).Succeeded);
        await r.Processor.RunOnceAsync();

        var posted = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.Posted, posted.Status);
        Assert.Equal("Edited by admin", r.Telegram.Messages.Single());
    }

    [Fact]
    public async Task Reject_NeverPosts()
    {
        var r = Create();
        var job = await Add(r, status: SocialShareStatus.AwaitingApproval);

        Assert.True((await Admin(r).RejectAsync(job.Id, "admin-1")).Succeeded);
        await r.Processor.RunOnceAsync();

        Assert.Equal(SocialShareStatus.Skipped, (await Reload(r, job.Id)).Status);
        Assert.Equal(0, r.Telegram.Calls);
    }

    [Fact]
    public async Task Approve_RejectsWrongStateAndOverlongInstagramCaptions()
    {
        var r = Create();
        var pending = await Add(r);
        Assert.Equal("NotAwaitingApproval", (await Admin(r).ApproveAsync(pending.Id, null, "a")).ErrorCode);

        var ig = await Add(r, "instagram", SocialShareStatus.AwaitingApproval, entity: 2);
        var result = await Admin(r).ApproveAsync(ig.Id, new string('x', 2201), "a");
        Assert.Equal("TooLong", result.ErrorCode);
        Assert.Equal(SocialShareStatus.AwaitingApproval, (await Reload(r, ig.Id)).Status);
    }

    [Fact]
    public async Task Regenerate_ClearsThePreview_SoItIsBuiltAgain()
    {
        var r = Create();
        var job = await Add(r, status: SocialShareStatus.AwaitingApproval);
        await r.Processor.RunOnceAsync();

        Assert.True((await Admin(r).RegenerateAsync(job.Id)).Succeeded);
        var cleared = await Reload(r, job.Id);
        Assert.Null(cleared.ImageUrl);
        Assert.Null(cleared.Message);

        await r.Processor.RunOnceAsync();
        Assert.NotNull((await Reload(r, job.Id)).Message);
        Assert.Equal(2, r.Images.Calls);
    }

    // ---- manual retry ----------------------------------------------------------------------------

    [Fact]
    public async Task RetryButton_RequeuesAFailedShare_WithAFreshAttemptBudget()
    {
        var r = Create();
        var job = await Add(r);
        r.Telegram.Script.Enqueue(new SocialShareException("chat not found", retryable: false));
        await r.Processor.RunOnceAsync();
        Assert.Equal(SocialShareStatus.Failed, (await Reload(r, job.Id)).Status);

        Assert.True((await Admin(r).RetryAsync(job.Id, "admin-1")).Succeeded);
        var queued = await Reload(r, job.Id);
        Assert.Equal(SocialShareStatus.Pending, queued.Status);
        Assert.Equal(0, queued.Attempts);
        Assert.Null(queued.Error);

        await r.Processor.RunOnceAsync();
        Assert.Equal(SocialShareStatus.Posted, (await Reload(r, job.Id)).Status);
        Assert.Equal(2, r.Telegram.Calls);
    }

    [Fact]
    public async Task Retry_IsRefused_ForSharesThatAreNotFailed()
    {
        var r = Create();
        var job = await Add(r);
        Assert.Equal("NotFailed", (await Admin(r).RetryAsync(job.Id, "admin-1")).ErrorCode);
        Assert.Equal("NotFound", (await Admin(r).RetryAsync(999, "admin-1")).ErrorCode);
    }
}
