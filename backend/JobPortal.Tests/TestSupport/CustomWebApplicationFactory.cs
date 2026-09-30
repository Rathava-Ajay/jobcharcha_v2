using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.InMemory.Infrastructure.Internal;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace JobPortal.Tests.TestSupport;

/// <summary>
/// Spins up the real API — real controllers, real [Authorize(Roles=...)] middleware, the real
/// AuthService/JWT-issuing pipeline — against an isolated InMemory database instead of the real
/// SQL Server, with Razorpay/email swapped for fakes so no real network calls happen. Exists to
/// prove role-based authorization is actually enforced by the running HTTP pipeline, which a unit
/// test that only instantiates AuthService in isolation can't demonstrate.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_dbName)
                    // Same InMemory-provider quirk noted throughout this test suite: it has no
                    // real transaction concept and escalates that mismatch to an error by default.
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

            services.RemoveAll<IRazorpayClient>();
            services.AddSingleton<IRazorpayClient, FakeRazorpayClient>();

            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender, NullEmailSender>();

            // Background services (payment reconciliation, employer notification sweep, the
            // queued-work processor) have no place running during a request/response test — the
            // reconciliation service in particular would otherwise fire a real outbound call on
            // startup even against this InMemory DB.
            services.RemoveAll<IHostedService>();
        });
    }

    /// <summary>A fresh InMemory database starts empty; AuthService.RegisterAsync requires the
    /// target role to already exist as an AspNetRoles row, same as the real seeded DB has.</summary>
    public async Task SeedRolesAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var name in new[] { "SuperAdmin", "Admin", "Employer", "JobSeeker", "User" })
        {
            if (!await db.AspNetRoles.AnyAsync(r => r.Name == name))
            {
                db.AspNetRoles.Add(new AspNetRole { Id = Guid.NewGuid().ToString(), Name = name, NormalizedName = name.ToUpperInvariant() });
            }
        }
        await db.SaveChangesAsync();
    }
}

public class NullEmailSender : IEmailSender
{
    public Task SendAsync(string toEmail, string subject, string htmlBody) => Task.CompletedTask;
}
