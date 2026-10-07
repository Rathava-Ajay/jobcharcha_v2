using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Social;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPortal.Tests;

/// <summary>Shares queued while the post link pointed at localhost get the real site address once one is configured.</summary>
public class SocialLinkRepairTests
{
    private sealed class NoImages : ISocialImageService
    {
        public Task<string?> EnsureImageAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default) => Task.FromResult<string?>(job.ImageUrl);
        public Task<byte[]?> RenderPreviewAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct = default) => Task.FromResult<byte[]?>(null);
        public Task<string?> ApplyCustomHeroAsync(SocialShareJob job, SocialShareSetting setting, byte[] hero, CancellationToken ct = default) => Task.FromResult<string?>(null);
        public bool NeedsRehost(string? imageUrl) => false;
    }

    private sealed class RecordingChannel : ISocialChannel
    {
        public RecordingChannel(string channel) => Channel = channel;
        public string Channel { get; }
        public List<(string Url, string? Message)> Posted { get; } = new();
        public Task<string> PostAsync(SocialShareJob job, SocialShareSetting setting, CancellationToken ct) { Posted.Add((job.Url, job.Message)); return Task.FromResult("id-1"); }
    }

    [Fact]
    public async Task LocalhostLinks_AreRewrittenToThePublicSite_BeforeAnythingIsPosted()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var options = new SocialShareOptions { TelegramBotToken = "t", TelegramChannelId = "@c", PublicBaseUrl = "https://jobcharcha.com" };
        var channel = new RecordingChannel("telegram");
        var processor = new SocialShareProcessor(db, new ISocialChannel[] { channel }, new NoImages(), options, TimeProvider.System, NullLogger<SocialShareProcessor>.Instance);

        var queued = new SocialShareJob
        {
            Category = "job", EntityId = 1, Channel = "telegram", Status = SocialShareStatus.Pending, NextAttemptAt = DateTime.UtcNow.AddMinutes(-1),
            Title = "Anganwadi", Url = "http://localhost:3002/jobs/gujarat-anganwadi-2026", DetailsJson = "[]",
            Message = "Apply: http://localhost:3002/jobs/gujarat-anganwadi-2026", CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow,
        };
        var waiting = new SocialShareJob
        {
            Category = "job", EntityId = 2, Channel = "telegram", Status = SocialShareStatus.AwaitingApproval, Title = "Other",
            Url = "http://127.0.0.1:3000/jobs/other", DetailsJson = "[]", Message = "old http://127.0.0.1:3000/jobs/other", CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow,
        };
        var fine = new SocialShareJob
        {
            Category = "job", EntityId = 3, Channel = "telegram", Status = SocialShareStatus.AwaitingApproval, Title = "Already public",
            Url = "https://jobcharcha.com/jobs/ok", DetailsJson = "[]", Message = "kept as written", CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow,
        };
        db.SocialShareJobs.AddRange(queued, waiting, fine);
        await db.SaveChangesAsync();

        await processor.RunOnceAsync();

        var posted = Assert.Single(channel.Posted);
        Assert.Equal("https://jobcharcha.com/jobs/gujarat-anganwadi-2026", posted.Url);
        Assert.DoesNotContain("localhost", posted.Message);

        var stillWaiting = await db.SocialShareJobs.AsNoTracking().SingleAsync(j => j.EntityId == 2);
        Assert.Equal("https://jobcharcha.com/jobs/other", stillWaiting.Url);
        Assert.DoesNotContain("127.0.0.1", stillWaiting.Message);              // preview rebuilt with the public link
        Assert.Equal(SocialShareStatus.AwaitingApproval, stillWaiting.Status);

        var untouched = await db.SocialShareJobs.AsNoTracking().SingleAsync(j => j.EntityId == 3);
        Assert.Equal("kept as written", untouched.Message);
    }

    [Fact]
    public async Task WithNoPublicAddressConfigured_LinksAreLeftAlone()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var options = new SocialShareOptions { TelegramBotToken = "t", TelegramChannelId = "@c", PublicBaseUrl = "http://localhost:3000" };
        var processor = new SocialShareProcessor(db, new ISocialChannel[] { new RecordingChannel("telegram") }, new NoImages(), options, TimeProvider.System, NullLogger<SocialShareProcessor>.Instance);
        db.SocialShareJobs.Add(new SocialShareJob
        {
            Category = "job", EntityId = 1, Channel = "telegram", Status = SocialShareStatus.AwaitingApproval, Title = "t",
            Url = "http://localhost:3000/jobs/a", DetailsJson = "[]", Message = "m", CreatedDate = DateTime.UtcNow, UpdatedDate = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        await processor.RunOnceAsync();

        Assert.Equal("http://localhost:3000/jobs/a", (await db.SocialShareJobs.AsNoTracking().SingleAsync()).Url);
    }
}
