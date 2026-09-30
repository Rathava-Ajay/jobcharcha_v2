using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Auth;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Tests;

public class AuthServiceLockoutTests
{
    private const string Password = "Correct-horse-battery-1";
    private const string Email = "lockme@example.com";

    private static IConfiguration Config() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "unit-test-signing-key-at-least-32-characters-long",
            ["Jwt:Issuer"] = "test",
            ["Jwt:Audience"] = "test",
        }).Build();

    private static async Task<(AuthService Service, AppDbContext Db)> SeedAsync(string dbName)
    {
        var db = TestDb.Create(dbName);
        var role = new AspNetRole { Id = Guid.NewGuid().ToString(), Name = AppRoles.JobSeeker, NormalizedName = AppRoles.JobSeeker.ToUpperInvariant() };
        db.AspNetRoles.Add(role);

        var user = new AspNetUser
        {
            Id = Guid.NewGuid().ToString(),
            Email = Email, NormalizedEmail = Email.ToUpperInvariant(),
            UserName = Email, NormalizedUserName = Email.ToUpperInvariant(),
            FirstName = "Lock", LastName = "Me", IsActive = true, IsDeleted = false,
            CreatedDate = DateTime.UtcNow, SecurityStamp = Guid.NewGuid().ToString(),
        };
        user.PasswordHash = new PasswordHasher<AspNetUser>().HashPassword(user, Password);
        user.Roles.Add(role);
        db.AspNetUsers.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, Config(), new NullEmailSender(), new HttpContextAccessor(), new NoOpAuditService());
        return (service, db);
    }

    private static LoginRequest Login(string password) => new() { Email = Email, Password = password, Role = "aspirant" };

    [Fact]
    public async Task LoginAsync_FifthWrongPassword_LocksAccount()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName());

        for (var i = 0; i < 4; i++)
            Assert.Equal("InvalidCredentials", (await service.LoginAsync(Login("wrong"))).ErrorCode);

        Assert.Equal("AccountLocked", (await service.LoginAsync(Login("wrong"))).ErrorCode);

        // Correct password is refused while the lockout stands.
        Assert.Equal("AccountLocked", (await service.LoginAsync(Login(Password))).ErrorCode);

        var reloaded = await db.AspNetUsers.AsNoTracking().SingleAsync();
        Assert.NotNull(reloaded.LockoutEnd);
        Assert.True(reloaded.LockoutEnd > DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task LoginAsync_SuccessBeforeThreshold_ResetsFailureState()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName());

        await service.LoginAsync(Login("wrong"));
        await service.LoginAsync(Login("wrong"));

        Assert.True((await service.LoginAsync(Login(Password))).Succeeded);

        var reloaded = await db.AspNetUsers.AsNoTracking().SingleAsync();
        Assert.Equal(0, reloaded.AccessFailedCount);
        Assert.Null(reloaded.LockoutEnd);
    }

    [Fact]
    public async Task LoginAsync_ExpiredLockout_AllowsSignIn()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName());
        var user = await db.AspNetUsers.SingleAsync();
        user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(-1);
        user.AccessFailedCount = 0;
        await db.SaveChangesAsync();

        var result = await service.LoginAsync(Login(Password));

        Assert.True(result.Succeeded);
        var reloaded = await db.AspNetUsers.AsNoTracking().SingleAsync();
        Assert.Null(reloaded.LockoutEnd);
    }
}
