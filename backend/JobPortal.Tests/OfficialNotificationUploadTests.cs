using JobPortal.Application.DTOs.Blogs;
using JobPortal.Application.DTOs.GovtSchemes;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;

namespace JobPortal.Tests;

/// <summary>
/// Covers the new "official notification / source" upload column added to Govt Schemes and Blogs
/// (the two modules that had no field to reuse). Guards the create/update/read mapping so a value
/// set on the admin form round-trips and a re-save without a change doesn't drop it.
/// </summary>
public class OfficialNotificationUploadTests
{
    [Fact]
    public async Task GovtScheme_OfficialNotificationUrl_RoundTripsThroughCreateAndUpdate()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = new GovtSchemeService(db);

        var created = await service.CreateAsync(new UpsertGovtSchemeRequest
        {
            Title = "PM Vishwakarma Yojana",
            Ministry = "Ministry of MSME",
            Category = "Employment",
            Eligibility = "Artisans and craftspeople",
            Benefits = "Toolkit incentive and collateral-free loans",
            ApplyLink = "https://pmvishwakarma.gov.in",
            OfficialNotificationUrl = "/uploads/notifications/scheme-notice.pdf",
        }, "admin-1");

        Assert.True(created.Succeeded);
        Assert.Equal("/uploads/notifications/scheme-notice.pdf", created.Data!.OfficialNotificationUrl);

        var reread = await service.GetByIdAsync(created.Data.Id);
        Assert.Equal("/uploads/notifications/scheme-notice.pdf", reread!.OfficialNotificationUrl);

        // Re-save carrying the same value back (what the admin edit form does).
        var updated = await service.UpdateAsync(created.Data.Id, new UpsertGovtSchemeRequest
        {
            Title = "PM Vishwakarma Yojana",
            Ministry = "Ministry of MSME",
            Category = "Employment",
            Eligibility = "Artisans and craftspeople",
            Benefits = "Toolkit incentive and collateral-free loans",
            ApplyLink = "https://pmvishwakarma.gov.in",
            OfficialNotificationUrl = reread.OfficialNotificationUrl,
        }, "admin-1");

        Assert.True(updated.Succeeded);
        Assert.Equal("/uploads/notifications/scheme-notice.pdf",
            (await service.GetByIdAsync(created.Data.Id))!.OfficialNotificationUrl);

        // Explicit clear also persists.
        await service.UpdateAsync(created.Data.Id, new UpsertGovtSchemeRequest
        {
            Title = "PM Vishwakarma Yojana",
            Ministry = "Ministry of MSME",
            Category = "Employment",
            Eligibility = "Artisans and craftspeople",
            Benefits = "Toolkit incentive and collateral-free loans",
            ApplyLink = "https://pmvishwakarma.gov.in",
            OfficialNotificationUrl = null,
        }, "admin-1");
        Assert.Null((await service.GetByIdAsync(created.Data.Id))!.OfficialNotificationUrl);
    }

    [Fact]
    public async Task Blog_OfficialNotificationUrl_RoundTripsThroughCreateAndUpdate()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        var service = new BlogService(db);

        var created = await service.CreateAsync(new UpsertBlogRequest
        {
            Title = "How to read a GSSSB notification",
            Excerpt = "A quick guide.",
            Content = "<p>Body</p>",
            OfficialNotificationUrl = "/uploads/notifications/source.png",
        }, "admin-1");

        Assert.True(created.Succeeded);
        Assert.Equal("/uploads/notifications/source.png", created.Data!.OfficialNotificationUrl);

        var reread = await service.GetByIdAsync(created.Data.Id);
        Assert.Equal("/uploads/notifications/source.png", reread!.OfficialNotificationUrl);

        var updated = await service.UpdateAsync(created.Data.Id, new UpsertBlogRequest
        {
            Title = "How to read a GSSSB notification",
            Excerpt = "A quick guide.",
            Content = "<p>Body</p>",
            OfficialNotificationUrl = "/uploads/notifications/source-v2.pdf",
        });

        Assert.True(updated.Succeeded);
        Assert.Equal("/uploads/notifications/source-v2.pdf",
            (await service.GetByIdAsync(created.Data.Id))!.OfficialNotificationUrl);
    }
}
