using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JobPortal.Tests;

/// <summary>Guards the DI registrations the hosted worker and controllers depend on, since a missing one only
/// shows up at runtime on the server.</summary>
public class SocialShareWiringTests
{
    [Fact]
    public void Worker_Controller_AndPublishingServices_AllResolve()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["TELEGRAM_BOT_TOKEN"] = "t", ["TELEGRAM_CHANNEL_ID"] = "@c", ["App:FrontendBaseUrl"] = "https://x.test",
            ["FileStorage:RootPath"] = Path.Combine(Path.GetTempPath(), "jp-wiring-test"),
        }).Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(config);
        services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services.AddInfrastructureServices(config);

        using var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = false });
        using var scope = provider.CreateScope();
        var sp = scope.ServiceProvider;

        Assert.NotNull(sp.GetRequiredService<SocialShareProcessor>());
        Assert.NotNull(sp.GetRequiredService<SocialStatusService>());
        Assert.NotNull(sp.GetRequiredService<ISocialShareService>());
        Assert.NotNull(sp.GetRequiredService<ITelegramClient>());
        Assert.NotNull(sp.GetRequiredService<IMetaGraphClient>());
        Assert.NotNull(sp.GetRequiredService<ISocialImageService>());
        Assert.Equal(new[] { "facebook", "instagram", "telegram" }, sp.GetServices<ISocialChannel>().Select(c => c.Channel).OrderBy(c => c));

        // The publishing services get the share hook injected.
        Assert.NotNull(sp.GetRequiredService<INewsService>());
        var options = sp.GetRequiredService<JobPortal.Application.Common.SocialShareOptions>();
        Assert.True(options.TelegramConfigured);
        Assert.False(options.InstagramConfigured);
        Assert.Equal("https://x.test", options.PublicBaseUrl);
    }
}
