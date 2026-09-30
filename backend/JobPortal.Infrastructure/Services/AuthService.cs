using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Auth;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace JobPortal.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IEmailSender _emailSender;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAuditService _audit;
    private readonly PasswordHasher<AspNetUser> _hasher = new();

    public AuthService(AppDbContext db, IConfiguration config, IEmailSender emailSender, IHttpContextAccessor httpContextAccessor, IAuditService audit)
    {
        _db = db;
        _config = config;
        _emailSender = emailSender;
        _httpContextAccessor = httpContextAccessor;
        _audit = audit;
    }

    public async Task<ServiceResult<AuthResult>> RegisterAsync(RegisterRequest request)
    {
        if (!RoleMapper.IsPubliclyRegisterable(request.Role))
            return ServiceResult<AuthResult>.Fail("RoleNotAllowed", "This role cannot self-register.");

        static string? Clean(string? v, int max) =>
            string.IsNullOrWhiteSpace(v) ? null : v.Trim().Length <= max ? v.Trim() : v.Trim()[..max];
        var signupSource = Clean(request.Source, 60);
        var signupCampaign = Clean(request.Campaign, 120);

        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var exists = await _db.AspNetUsers.AnyAsync(u => u.NormalizedEmail == normalizedEmail);
        if (exists)
            return ServiceResult<AuthResult>.Fail("EmailTaken", "An account with this email already exists.");

        var dbRole = RoleMapper.ToDbRole(request.Role);
        var role = await _db.AspNetRoles.FirstOrDefaultAsync(r => r.Name == dbRole);
        if (role is null)
            return ServiceResult<AuthResult>.Fail("RoleMissing", $"Role '{dbRole}' is not configured.");

        if (request.Role.Equals("employer", StringComparison.OrdinalIgnoreCase) && !request.AcknowledgedTerms)
            return ServiceResult<AuthResult>.Fail("TermsNotAccepted", "You must accept the employer terms to register.");

        var user = new AspNetUser
        {
            Id = Guid.NewGuid().ToString(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            UserName = request.Email.Trim(),
            NormalizedUserName = normalizedEmail,
            PhoneNumber = request.Phone,
            IsActive = true,
            IsDeleted = false,
            IsVerified = false,
            EmailConfirmed = false,
            IsEmailVerified = false,
            EmailVerifyToken = GenerateToken(),
            SecurityStamp = Guid.NewGuid().ToString(),
            ConcurrencyStamp = Guid.NewGuid().ToString(),
            CreatedDate = DateTime.UtcNow,
            ProfileCompletionScore = 0,
            EarlyAlertMinutes = 0,
            IsPremium = false,
            SignupSource = signupSource,
            SignupCampaign = signupCampaign,
        };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);
        user.Roles.Add(role);

        _db.AspNetUsers.Add(user);

        EmployerProfile? employerProfile = null;
        if (request.Role.Equals("employer", StringComparison.OrdinalIgnoreCase))
        {
            var companyName = request.CompanyName ?? $"{request.FirstName}'s Company";
            employerProfile = new EmployerProfile
            {
                UserId = user.Id,
                CompanyName = companyName,
                CompanySlug = await EnsureUniqueCompanySlugAsync(Slugify(companyName)),
                CompanySize = "Not specified",
                City = "Not specified",
                State = "Not specified",
                ContactName = $"{request.FirstName} {request.LastName}",
                ContactEmail = request.Email,
                ContactPhone = request.Phone ?? "Not specified",
                IsVerified = false,
                IsAgency = false,
                TotalJobsPosted = 0,
                TotalApplicationsReceived = 0,
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
            };
            _db.EmployerProfiles.Add(employerProfile);
        }

        // EnsureUniqueCompanySlugAsync is a check-then-insert and can lose a race with another
        // simultaneous employer signup for the same company name. On the resulting unique-index
        // violation, re-slug with a random suffix and retry rather than 500-ing the user.
        const int maxSlugAttempts = 5;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await _db.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException ex) when (employerProfile is not null
                && attempt < maxSlugAttempts
                && IsUniqueViolation(ex, "IX_EmployerProfiles_CompanySlug"))
            {
                var b = Slugify(employerProfile.CompanyName);
                employerProfile.CompanySlug = $"{b[..Math.Min(b.Length, 24)]}-{Guid.NewGuid():N}"[..37];
            }
        }

        if (employerProfile is not null)
        {
            _db.EmployerAcknowledgments.Add(new EmployerAcknowledgment
            {
                EmployerProfileId = employerProfile.Id,
                PlanVersion = EmployerTermsVersion.Current,
                AcceptedAt = DateTime.UtcNow,
                IpAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            });
            await _db.SaveChangesAsync();
        }

        await _emailSender.SendAsync(user.Email!, "Confirm your JobCharcha account",
            $"Welcome {user.FirstName}! Your confirmation code is: {user.EmailVerifyToken}");

        var isEmployer = request.Role.Equals("employer", StringComparison.OrdinalIgnoreCase);
        await _audit.LogAsync(new AuditEntry
        {
            EventType = isEmployer ? AuditEventTypes.EmployerRegistered : AuditEventTypes.AspirantRegistered,
            Category = AuditEventTypes.Categories.Auth,
            Summary = isEmployer
                ? $"New employer registered: {employerProfile?.CompanyName ?? request.CompanyName} ({user.Email})"
                : $"New aspirant registered: {user.Email}",
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            ActorRole = request.Role,
            TargetType = "AspNetUser",
            TargetId = user.Id,
            Metadata = new { companyName = employerProfile?.CompanyName, source = signupSource, campaign = signupCampaign },
        });

        var auth = await BuildAuthResultAsync(user);
        return ServiceResult<AuthResult>.Ok(auth);
    }

    // After this many consecutive failed password attempts the account is locked for LockoutMinutes.
    private const int MaxFailedAccessAttempts = 5;
    private const int LockoutMinutes = 15;

    public async Task<ServiceResult<AuthResult>> LoginAsync(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await _db.AspNetUsers.Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail && !u.IsDeleted);

        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
            return ServiceResult<AuthResult>.Fail("InvalidCredentials", "Invalid email or password.");

        if (user.LockoutEnd is not null && user.LockoutEnd > DateTimeOffset.UtcNow)
            return ServiceResult<AuthResult>.Fail("AccountLocked",
                "Too many failed sign-in attempts. Try again in a few minutes, or reset your password.");

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify == PasswordVerificationResult.Failed)
        {
            user.AccessFailedCount += 1;
            var justLocked = user.AccessFailedCount >= MaxFailedAccessAttempts;
            if (justLocked)
            {
                user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(LockoutMinutes);
                user.AccessFailedCount = 0; // fresh allowance once the lockout expires
            }
            await _db.SaveChangesAsync();
            return justLocked
                ? ServiceResult<AuthResult>.Fail("AccountLocked",
                    $"Too many failed sign-in attempts. This account is locked for {LockoutMinutes} minutes.")
                : ServiceResult<AuthResult>.Fail("InvalidCredentials", "Invalid email or password.");
        }

        if (!user.IsActive)
            return ServiceResult<AuthResult>.Fail("AccountDisabled", "This account has been disabled.");

        var expectedDbRole = RoleMapper.ToDbRole(request.Role);
        var hasRole = user.Roles.Any(r => r.Name == expectedDbRole);
        if (!hasRole)
            return ServiceResult<AuthResult>.Fail("WrongRole", $"This account is not registered as {request.Role}.");

        // Successful sign-in — clear any accumulated failure state.
        if (user.AccessFailedCount != 0 || user.LockoutEnd is not null)
        {
            user.AccessFailedCount = 0;
            user.LockoutEnd = null;
        }
        user.LastLoginAt = DateTime.UtcNow;
        user.LastLoginDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var auth = await BuildAuthResultAsync(user);
        return ServiceResult<AuthResult>.Ok(auth);
    }

    public async Task<ServiceResult<AuthResult>> RefreshAsync(string refreshToken)
    {
        var user = await _db.AspNetUsers.Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

        if (user is null || user.RefreshTokenExpiry is null || user.RefreshTokenExpiry < DateTime.UtcNow)
            return ServiceResult<AuthResult>.Fail("InvalidRefreshToken", "Refresh token is invalid or expired.");

        var auth = await BuildAuthResultAsync(user);
        return ServiceResult<AuthResult>.Ok(auth);
    }

    public async Task<ServiceResult> LogoutAsync(string userId)
    {
        var user = await _db.AspNetUsers.FindAsync(userId);
        if (user is null) return ServiceResult.Ok();

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await _db.AspNetUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);
        if (user is null)
            return ServiceResult.Ok(); // don't leak account existence

        user.PasswordResetToken = GenerateToken();
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
        await _db.SaveChangesAsync();

        await _emailSender.SendAsync(user.Email!, "Reset your password",
            $"Your password reset code is: {user.PasswordResetToken} (valid for 1 hour)");

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await _db.AspNetUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);
        if (user is null || user.PasswordResetToken != request.Token ||
            user.PasswordResetExpiry is null || user.PasswordResetExpiry < DateTime.UtcNow)
            return ServiceResult.Fail("InvalidToken", "Reset token is invalid or expired.");

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;
        user.SecurityStamp = Guid.NewGuid().ToString();
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await _db.AspNetUsers.FindAsync(userId);
        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
            return ServiceResult.Fail("NotFound", "User not found.");

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verify == PasswordVerificationResult.Failed)
            return ServiceResult.Fail("InvalidCredentials", "Current password is incorrect.");

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString();
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ConfirmEmailAsync(ConfirmEmailRequest request)
    {
        var user = await _db.AspNetUsers.FindAsync(request.UserId);
        if (user is null || user.EmailVerifyToken != request.Token)
            return ServiceResult.Fail("InvalidToken", "Confirmation token is invalid.");

        user.EmailConfirmed = true;
        user.IsEmailVerified = true;
        user.IsVerified = true;
        user.EmailVerifyToken = null;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ResendConfirmationAsync(ResendConfirmationRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await _db.AspNetUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);
        if (user is null || user.EmailConfirmed)
            return ServiceResult.Ok();

        user.EmailVerifyToken = GenerateToken();
        await _db.SaveChangesAsync();

        await _emailSender.SendAsync(user.Email!, "Confirm your JobCharcha account",
            $"Your confirmation code is: {user.EmailVerifyToken}");

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<UserProfileDto>> GetProfileAsync(string userId)
    {
        var user = await _db.AspNetUsers.Include(u => u.Roles).Include(u => u.EmployerProfile).Include(u => u.JobSeekerProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return ServiceResult<UserProfileDto>.Fail("NotFound", "User not found.");
        return ServiceResult<UserProfileDto>.Ok(ToDto(user, user.EmployerProfile, user.JobSeekerProfile));
    }

    public async Task<ServiceResult<UserProfileDto>> UpdateProfileAsync(string userId, UpdateProfileRequest request)
    {
        var user = await _db.AspNetUsers.Include(u => u.Roles).Include(u => u.EmployerProfile).Include(u => u.JobSeekerProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return ServiceResult<UserProfileDto>.Fail("NotFound", "User not found.");

        if (!string.IsNullOrWhiteSpace(request.FirstName)) user.FirstName = request.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(request.LastName)) user.LastName = request.LastName.Trim();
        if (request.Phone is not null) user.PhoneNumber = request.Phone;

        if (!string.IsNullOrWhiteSpace(request.CompanyName) && user.EmployerProfile is not null)
            user.EmployerProfile.CompanyName = request.CompanyName;

        await _db.SaveChangesAsync();
        return ServiceResult<UserProfileDto>.Ok(ToDto(user, user.EmployerProfile, user.JobSeekerProfile));
    }

    public async Task<ServiceResult<string>> UpdateAvatarUrlAsync(string userId, string url)
    {
        var user = await _db.AspNetUsers.FindAsync(userId);
        if (user is null) return ServiceResult<string>.Fail("NotFound", "User not found.");

        user.ProfilePictureUrl = url;
        user.ProfilePicture = url;
        await _db.SaveChangesAsync();
        return ServiceResult<string>.Ok(url);
    }

    public async Task<ServiceResult<string>> UpdateResumeUrlAsync(string userId, string url)
    {
        var user = await _db.AspNetUsers.FindAsync(userId);
        if (user is null) return ServiceResult<string>.Fail("NotFound", "User not found.");

        user.Resume = url;

        // Keep the Career Hub's résumé panel (uploaded-date + completion %) in step. Create the
        // JobSeekerProfile row if the aspirant hasn't opened their profile yet.
        var seeker = await _db.JobSeekerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (seeker is null)
        {
            seeker = new JobSeekerProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.JobSeekerProfiles.Add(seeker);
        }
        seeker.ResumeUrl = url;
        seeker.ResumeUploadedAt = DateTime.UtcNow;
        seeker.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ServiceResult<string>.Ok(url);
    }

    private async Task<AuthResult> BuildAuthResultAsync(AspNetUser user)
    {
        if (user.Roles.Count == 0)
        {
            await _db.Entry(user).Collection(u => u.Roles).LoadAsync();
        }

        var accessMinutes = _config.GetValue<int?>("Jwt:AccessTokenMinutes") ?? 60;
        var refreshDays = _config.GetValue<int?>("Jwt:RefreshTokenDays") ?? 30;
        var expiresAt = DateTime.UtcNow.AddMinutes(accessMinutes);

        var token = GenerateJwt(user, expiresAt);
        var refreshToken = GenerateToken(64);

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshDays);
        await _db.SaveChangesAsync();

        var employer = await _db.EmployerProfiles.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == user.Id);
        var seeker = await _db.JobSeekerProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == user.Id);

        return new AuthResult
        {
            AccessToken = token,
            RefreshToken = refreshToken,
            ExpiresAt = new DateTimeOffset(expiresAt).ToUnixTimeMilliseconds(),
            User = ToDto(user, employer, seeker),
        };
    }

    private string GenerateJwt(AspNetUser user, DateTime expiresAt)
    {
        var jwtSection = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var dbRole = RoleMapper.ResolveDbRole(user.Roles.Select(r => r.Name));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new(ClaimTypes.Role, dbRole),
        };
        foreach (var role in user.Roles)
        {
            if (role.Name is not null && role.Name != dbRole)
                claims.Add(new Claim(ClaimTypes.Role, role.Name));
        }

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateToken(int bytes = 32) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes)).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static string Slugify(string value) =>
        value.Trim().ToLowerInvariant().Replace(" ", "-").Replace("/", "-").Replace("--", "-");

    /// <summary>SQL Server error 2601/2627 = unique index/constraint violation; the index-name hint
    /// keeps an unrelated unique clash (e.g. email) from being mistaken for the slug race.</summary>
    private static bool IsUniqueViolation(DbUpdateException ex, string? indexNameHint = null)
    {
        if (ex.InnerException is not SqlException sql) return false;
        if (sql.Number != 2601 && sql.Number != 2627) return false;
        return indexNameHint is null || sql.Message.Contains(indexNameHint, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<string> EnsureUniqueCompanySlugAsync(string baseSlug)
    {
        if (string.IsNullOrWhiteSpace(baseSlug)) baseSlug = "company";
        var slug = baseSlug;
        var suffix = 2;
        while (await _db.EmployerProfiles.AnyAsync(e => e.CompanySlug == slug))
        {
            slug = $"{baseSlug}-{suffix++}";
        }
        return slug;
    }

    private static UserProfileDto ToDto(AspNetUser user, EmployerProfile? employer = null, JobSeekerProfile? seeker = null)
    {
        var role = RoleMapper.ToUiRole(RoleMapper.ResolveDbRole(user.Roles.Select(r => r.Name)));
        return new()
        {
            Id = user.Id,
            Name = $"{user.FirstName} {user.LastName}".Trim(),
            Email = user.Email ?? string.Empty,
            Phone = user.PhoneNumber,
            Role = role,
            AvatarUrl = user.ProfilePictureUrl,
            CompanyName = employer?.CompanyName,
            CompanyLogo = employer?.LogoUrl,
            IsCompanyVerified = employer is null ? null : employer.IsVerified,
            ResumeUrl = user.Resume,
            Education = null,
            ProfileScore = user.ProfileCompletionScore,
            WalletBalance = 0,
            UnlockedResumesCount = 0,
            ReferralCode = user.Id[..8].ToUpperInvariant(),
            ReferralsCount = 0,
            Status = user.IsActive ? "Active" : "Suspended",
            EmailConfirmed = user.EmailConfirmed,
            NeedsProfileSetup = role == "aspirant" && seeker?.ProfileCompletedAt is null,
        };
    }
}
