using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Tests;

public class JobAlertEmailTemplateTests
{
    private static Job SampleJob() => new()
    {
        Title = "Junior Clerk <script>alert(1)</script>", Slug = "junior-clerk", OrganizationName = "GSSSB",
        Location = "Gandhinagar", Salary = "₹19,950 – 63,200", ShortDescription = "<p>Apply <b>now</b> for 120 posts.</p>",
        LastDate = new DateTime(2026, 11, 30),
    };

    private static IConfiguration Config(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    [Fact]
    public void Build_IncludesAllCommunityLinks_AndEncodesJobText()
    {
        var links = CommunityLinks.From(Config(new()
        {
            ["Community:WhatsAppGroupUrl"] = "https://chat.whatsapp.com/abc",
            ["Community:TelegramUrl"] = "@jobcharcha_tg",
            ["Community:InstagramHandle"] = "@jobcharcha",
        }), "https://jobcharcha.com");

        var html = JobAlertEmailTemplate.Build(SampleJob(), "Clerk", "https://jobcharcha.com/jobs/junior-clerk", "https://jobcharcha.com/unsubscribe/t", links);

        Assert.Contains("https://chat.whatsapp.com/abc", html);
        Assert.Contains("https://t.me/jobcharcha_tg", html);
        Assert.Contains("https://instagram.com/jobcharcha", html);
        Assert.Contains("@jobcharcha", html);
        Assert.Contains("https://jobcharcha.com/jobs/junior-clerk", html);
        Assert.Contains("/unsubscribe/t", html);
        Assert.Contains("Apply now for 120 posts.", html);
        Assert.DoesNotContain("<script>", html);
    }

    [Fact]
    public void Build_HidesCommunityButtonsThatAreNotConfigured()
    {
        var links = CommunityLinks.From(Config(new()), "https://jobcharcha.com");
        var html = JobAlertEmailTemplate.Build(SampleJob(), "Clerk", "https://jobcharcha.com/jobs/x", "https://jobcharcha.com/unsubscribe/t", links);

        Assert.DoesNotContain("WhatsApp", html);
        Assert.DoesNotContain("Telegram", html);
        Assert.DoesNotContain("Instagram", html);
        Assert.Contains("Visit jobcharcha.com", html);
    }
}
