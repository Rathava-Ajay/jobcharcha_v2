using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("NormalizedEmail", Name = "EmailIndex")]
public partial class AspNetUser
{
    [Key]
    public string Id { get; set; } = null!;

    public string FirstName { get; set; } = null!;

    public string LastName { get; set; } = null!;

    public string? ProfilePicture { get; set; }

    public string? Resume { get; set; }

    public DateTime? DateOfBirth { get; set; }

    public string? City { get; set; }

    public string? State { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? LastLoginDate { get; set; }

    [StringLength(256)]
    public string? UserName { get; set; }

    [StringLength(256)]
    public string? NormalizedUserName { get; set; }

    [StringLength(256)]
    public string? Email { get; set; }

    [StringLength(256)]
    public string? NormalizedEmail { get; set; }

    public bool EmailConfirmed { get; set; }

    public string? PasswordHash { get; set; }

    public string? SecurityStamp { get; set; }

    public string? ConcurrencyStamp { get; set; }

    public string? PhoneNumber { get; set; }

    public bool PhoneNumberConfirmed { get; set; }

    public bool TwoFactorEnabled { get; set; }

    public DateTimeOffset? LockoutEnd { get; set; }

    public bool LockoutEnabled { get; set; }

    public int AccessFailedCount { get; set; }

    public bool IsDeleted { get; set; }

    public bool IsVerified { get; set; }

    public int ProfileCompletionScore { get; set; }

    public string? ProfilePictureUrl { get; set; }

    public string? EmailVerifyToken { get; set; }

    public bool IsActive { get; set; }

    public bool IsEmailVerified { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public DateTime? PasswordResetExpiry { get; set; }

    public string? PasswordResetToken { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiry { get; set; }

    public int EarlyAlertMinutes { get; set; }

    public bool IsPremium { get; set; }

    public string? PremiumPlan { get; set; }

    public DateTime? PremiumUntil { get; set; }

    /// <summary>Where this account came from at signup — e.g. "instagram" from a ?ref= / ?utm_source=
    /// on a campaign deep link. Null for organic signups. Set once by AuthService.RegisterAsync.</summary>
    [StringLength(60)]
    public string? SignupSource { get; set; }

    /// <summary>Campaign tag captured at signup (utm_campaign), e.g. "ig-2026-10".</summary>
    [StringLength(120)]
    public string? SignupCampaign { get; set; }

    [InverseProperty("CreatedBy")]
    public virtual ICollection<AdmitCard> AdmitCards { get; set; } = new List<AdmitCard>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<AnswerKey> AnswerKeys { get; set; } = new List<AnswerKey>();

    [InverseProperty("User")]
    public virtual ICollection<AspNetUserClaim> AspNetUserClaims { get; set; } = new List<AspNetUserClaim>();

    [InverseProperty("User")]
    public virtual ICollection<AspNetUserLogin> AspNetUserLogins { get; set; } = new List<AspNetUserLogin>();

    [InverseProperty("User")]
    public virtual ICollection<AspNetUserToken> AspNetUserTokens { get; set; } = new List<AspNetUserToken>();

    [InverseProperty("User")]
    public virtual ICollection<AspirantPayment> AspirantPayments { get; set; } = new List<AspirantPayment>();

    [InverseProperty("User")]
    public virtual ICollection<Attempt> Attempts { get; set; } = new List<Attempt>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<Blog> Blogs { get; set; } = new List<Blog>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<Category> CategoryCreatedBies { get; set; } = new List<Category>();

    [InverseProperty("UpdatedBy")]
    public virtual ICollection<Category> CategoryUpdatedBies { get; set; } = new List<Category>();

    [InverseProperty("User")]
    public virtual ICollection<DailyQuizAttempt> DailyQuizAttempts { get; set; } = new List<DailyQuizAttempt>();

    [InverseProperty("CandidateUser")]
    public virtual ICollection<EmployerContactLog> EmployerContactLogsAsCandidate { get; set; } = new List<EmployerContactLog>();

    [InverseProperty("User")]
    public virtual EmployerProfile? EmployerProfile { get; set; }

    [InverseProperty("CreatedByUser")]
    public virtual ICollection<CreditTransaction> CreditTransactionsCreated { get; set; } = new List<CreditTransaction>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<GovtScheme> GovtSchemes { get; set; } = new List<GovtScheme>();

    [InverseProperty("User")]
    public virtual ICollection<InAppNotification> InAppNotifications { get; set; } = new List<InAppNotification>();

    [InverseProperty("User")]
    public virtual ICollection<JobAlert> JobAlerts { get; set; } = new List<JobAlert>();

    [InverseProperty("ApplicantUser")]
    public virtual ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();

    [InverseProperty("User")]
    public virtual JobSeekerProfile? JobSeekerProfile { get; set; }

    [InverseProperty("CreatedBy")]
    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<News> News { get; set; } = new List<News>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<OldPaper> OldPapers { get; set; } = new List<OldPaper>();

    [InverseProperty("User")]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();

    [InverseProperty("User")]
    public virtual ICollection<PushSubscription> PushSubscriptions { get; set; } = new List<PushSubscription>();

    [InverseProperty("User")]
    public virtual ICollection<ReferralTracking> ReferralTrackings { get; set; } = new List<ReferralTracking>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<Result> Results { get; set; } = new List<Result>();

    [InverseProperty("User")]
    public virtual ICollection<ResultsAnalytic> ResultsAnalytics { get; set; } = new List<ResultsAnalytic>();

    [InverseProperty("User")]
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

    [InverseProperty("CreatedBy")]
    public virtual ICollection<Syllabuse> Syllabuses { get; set; } = new List<Syllabuse>();

    [InverseProperty("User")]
    public virtual ICollection<TestAttempt> TestAttempts { get; set; } = new List<TestAttempt>();

    [InverseProperty("User")]
    public virtual ICollection<TestPurchase> TestPurchases { get; set; } = new List<TestPurchase>();

    [InverseProperty("User")]
    public virtual WalletCredit? WalletCredit { get; set; }

    [InverseProperty("User")]
    public virtual ICollection<WalletTransaction> WalletTransactions { get; set; } = new List<WalletTransaction>();

    [ForeignKey("UserId")]
    [InverseProperty("Users")]
    public virtual ICollection<AspNetRole> Roles { get; set; } = new List<AspNetRole>();
}
