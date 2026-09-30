using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JobPortal.Application.DTOs.Auth;
using JobPortal.Tests.TestSupport;

namespace JobPortal.Tests;

/// <summary>
/// Audits the "role param required" sign-in flow end-to-end against the real HTTP pipeline —
/// AuthService.LoginAsync/RegisterAsync already only issue a JWT role claim from the user's real
/// AspNetUserRoles assignment (never from the client-supplied Role field on the request, which is
/// used only to pick which "you're not registered as X" error to show — see
/// AuthService.cs:142-145 and GenerateJwt's use of RoleMapper.ResolveDbRole(user.Roles...)). These
/// tests prove that server-side enforcement actually holds at the HTTP boundary, not just that the
/// code reads that way in isolation.
/// </summary>
public class AdminAuthorizationTests : IClassFixture<CustomWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private const string AdminOnlyEndpoint = "/api/admin/payments/stuck";

    private readonly CustomWebApplicationFactory _factory;

    public AdminAuthorizationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<string> RegisterAndGetAccessTokenAsync(HttpClient client, string role, string emailPrefix)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Test",
            lastName = "User",
            email = $"{emailPrefix}-{Guid.NewGuid():N}@example.com",
            password = "P@ssw0rd123",
            role,
            companyName = role == "employer" ? "Test Co" : null,
            acknowledgedTerms = role == "employer",
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResult>(JsonOptions);
        return auth!.AccessToken;
    }

    [Fact]
    public async Task AdminEndpoint_WithAspirantJwt_Returns403()
    {
        await _factory.SeedRolesAsync();
        var client = _factory.CreateClient();
        var token = await RegisterAndGetAccessTokenAsync(client, "aspirant", "aspirant");

        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        var response = await client.GetAsync(AdminOnlyEndpoint);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_WithEmployerJwt_Returns403()
    {
        await _factory.SeedRolesAsync();
        var client = _factory.CreateClient();
        var token = await RegisterAndGetAccessTokenAsync(client, "employer", "employer");

        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        var response = await client.GetAsync(AdminOnlyEndpoint);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_WithNoToken_Returns401NotForbidden()
    {
        await _factory.SeedRolesAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync(AdminOnlyEndpoint);

        // Distinguishes "you're not who you claim" (401) from "you are, but you're not allowed"
        // (403) — confirms the endpoint isn't simply open and returning 403 to everyone regardless.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithAdminRoleParam_OnAnAspirantOnlyAccount_IsRejectedNotJustDowngraded()
    {
        // The actual escalation risk this whole audit is about: could a client just send
        // role:"admin" in the /login body for an account that has no real Admin row in
        // AspNetUserRoles, and get an Admin-privileged token back anyway? It must not.
        await _factory.SeedRolesAsync();
        var client = _factory.CreateClient();
        var email = $"aspirant-only-{Guid.NewGuid():N}@example.com";
        const string password = "P@ssw0rd123";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Test", lastName = "User", email, password, role = "aspirant",
        });
        registerResponse.EnsureSuccessStatusCode();

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email, password, role = "admin" });

        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
        var body = await loginResponse.Content.ReadAsStringAsync();
        Assert.Contains("WrongRole", body);
    }

    [Fact]
    public async Task Register_WithAdminRoleParam_IsRejected_AdminCannotSelfRegister()
    {
        await _factory.SeedRolesAsync();
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Test", lastName = "User", email = $"wannabe-admin-{Guid.NewGuid():N}@example.com",
            password = "P@ssw0rd123", role = "admin",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("RoleNotAllowed", body);
    }
}
