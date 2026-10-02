using System;
using System.Collections.Generic;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AdmitCard> AdmitCards { get; set; }

    public virtual DbSet<Advertisement> Advertisements { get; set; }

    public virtual DbSet<AffiliateLink> AffiliateLinks { get; set; }

    public virtual DbSet<AlertPreference> AlertPreferences { get; set; }

    public virtual DbSet<AnswerKey> AnswerKeys { get; set; }

    public virtual DbSet<AspNetRole> AspNetRoles { get; set; }

    public virtual DbSet<AspNetRoleClaim> AspNetRoleClaims { get; set; }

    public virtual DbSet<AspNetUser> AspNetUsers { get; set; }

    public virtual DbSet<AspNetUserClaim> AspNetUserClaims { get; set; }

    public virtual DbSet<AspNetUserLogin> AspNetUserLogins { get; set; }

    public virtual DbSet<AspNetUserToken> AspNetUserTokens { get; set; }

    public virtual DbSet<AspirantPayment> AspirantPayments { get; set; }

    public virtual DbSet<AuditEvent> AuditEvents { get; set; }

    public virtual DbSet<AspirantPlan> AspirantPlans { get; set; }

    public virtual DbSet<Attempt> Attempts { get; set; }

    public virtual DbSet<Blog> Blogs { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Contact> Contacts { get; set; }

    public virtual DbSet<ConversionTracking> ConversionTrackings { get; set; }

    public virtual DbSet<CreditTransaction> CreditTransactions { get; set; }

    public virtual DbSet<CurrentAffairsPost> CurrentAffairsPosts { get; set; }

    public virtual DbSet<CutOffRecord> CutOffRecords { get; set; }

    public virtual DbSet<DailyQuiz> DailyQuizzes { get; set; }

    public virtual DbSet<DailyQuizAttempt> DailyQuizAttempts { get; set; }

    public virtual DbSet<DailyQuizQuestion> DailyQuizQuestions { get; set; }

    public virtual DbSet<Dispute> Disputes { get; set; }

    public virtual DbSet<District> Districts { get; set; }

    public virtual DbSet<EmailLog> EmailLogs { get; set; }

    public virtual DbSet<EmployerAcknowledgment> EmployerAcknowledgments { get; set; }

    public virtual DbSet<EmployerContactLog> EmployerContactLogs { get; set; }

    public virtual DbSet<EmployerCredits> EmployerCredits { get; set; }

    public virtual DbSet<EmployerJob> EmployerJobs { get; set; }

    public virtual DbSet<EmployerPayment> EmployerPayments { get; set; }

    public virtual DbSet<EmployerPlan> EmployerPlans { get; set; }

    public virtual DbSet<EmployerProfile> EmployerProfiles { get; set; }

    public virtual DbSet<EmployerSubscription> EmployerSubscriptions { get; set; }

    public virtual DbSet<Exam> Exams { get; set; }

    public virtual DbSet<ExamCalendarEvent> ExamCalendarEvents { get; set; }

    public virtual DbSet<ExamEvent> ExamEvents { get; set; }

    public virtual DbSet<ExamMaterial> ExamMaterials { get; set; }

    public virtual DbSet<ExamNotification> ExamNotifications { get; set; }

    public virtual DbSet<ExamReminder> ExamReminders { get; set; }

    public virtual DbSet<GovtScheme> GovtSchemes { get; set; }

    public virtual DbSet<HistoricalCutoff> HistoricalCutoffs { get; set; }

    public virtual DbSet<InAppNotification> InAppNotifications { get; set; }

    public virtual DbSet<Job> Jobs { get; set; }

    public virtual DbSet<JobAlert> JobAlerts { get; set; }

    public virtual DbSet<JobApplication> JobApplications { get; set; }

    public virtual DbSet<JobDocument> JobDocuments { get; set; }

    public virtual DbSet<ContentCategorySetting> ContentCategorySettings { get; set; }

    public virtual DbSet<ContentDraft> ContentDrafts { get; set; }

    public virtual DbSet<ContentSource> ContentSources { get; set; }

    public virtual DbSet<ContentSyncRun> ContentSyncRuns { get; set; }

    public virtual DbSet<JobDraftQueue> JobDraftQueues { get; set; }

    public virtual DbSet<JobFeedSource> JobFeedSources { get; set; }

    public virtual DbSet<JobPost> JobPosts { get; set; }

    public virtual DbSet<JobSeekerProfile> JobSeekerProfiles { get; set; }

    public virtual DbSet<MockTest> MockTests { get; set; }

    public virtual DbSet<News> News { get; set; }

    public virtual DbSet<OldPaper> OldPapers { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<OtpChallenge> OtpChallenges { get; set; }

    public virtual DbSet<PaymentLog> PaymentLogs { get; set; }

    public virtual DbSet<Post> Posts { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ProductDownload> ProductDownloads { get; set; }

    public virtual DbSet<ProductReview> ProductReviews { get; set; }

    public virtual DbSet<PushSubscription> PushSubscriptions { get; set; }

    public virtual DbSet<Question> Questions { get; set; }

    public virtual DbSet<Referral> Referrals { get; set; }

    public virtual DbSet<ReferralTracking> ReferralTrackings { get; set; }

    public virtual DbSet<Response> Responses { get; set; }

    public virtual DbSet<Result> Results { get; set; }

    public virtual DbSet<ResultsAnalytic> ResultsAnalytics { get; set; }

    public virtual DbSet<RevenueEntry> RevenueEntries { get; set; }

    public virtual DbSet<ScheduledSocialPost> ScheduledSocialPosts { get; set; }

    public virtual DbSet<ShareTracking> ShareTrackings { get; set; }

    public virtual DbSet<SiteNotification> SiteNotifications { get; set; }

    public virtual DbSet<SocialGrowthMetric> SocialGrowthMetrics { get; set; }

    public virtual DbSet<Subscriber> Subscribers { get; set; }

    public virtual DbSet<Subscription> Subscriptions { get; set; }

    public virtual DbSet<SuccessStory> SuccessStories { get; set; }

    public virtual DbSet<Syllabuse> Syllabuses { get; set; }

    public virtual DbSet<Test> Tests { get; set; }

    public virtual DbSet<TestAttempt> TestAttempts { get; set; }

    public virtual DbSet<TestPurchase> TestPurchases { get; set; }

    public virtual DbSet<TestQuestion> TestQuestions { get; set; }

    public virtual DbSet<TestSection> TestSections { get; set; }

    public virtual DbSet<WalletAdjustmentAuditLog> WalletAdjustmentAuditLogs { get; set; }

    public virtual DbSet<WalletCredit> WalletCredits { get; set; }

    public virtual DbSet<WalletTransaction> WalletTransactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdmitCard>(entity =>
        {
            entity.Property(e => e.CreatedById).HasDefaultValue("");
            entity.Property(e => e.State).HasDefaultValue("");
        });

        modelBuilder.Entity<AffiliateLink>(entity =>
        {
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<AnswerKey>(entity =>
        {
            entity.HasOne(d => d.Category).WithMany(p => p.AnswerKeys).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.CreatedBy).WithMany(p => p.AnswerKeys).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<AspNetRole>(entity =>
        {
            entity.HasIndex(e => e.NormalizedName, "RoleNameIndex")
                .IsUnique()
                .HasFilter("([NormalizedName] IS NOT NULL)");
        });

        modelBuilder.Entity<AspNetUser>(entity =>
        {
            entity.HasIndex(e => e.NormalizedUserName, "UserNameIndex")
                .IsUnique()
                .HasFilter("([NormalizedUserName] IS NOT NULL)");

            entity.HasMany(d => d.Roles).WithMany(p => p.Users)
                .UsingEntity<Dictionary<string, object>>(
                    "AspNetUserRole",
                    r => r.HasOne<AspNetRole>().WithMany().HasForeignKey("RoleId"),
                    l => l.HasOne<AspNetUser>().WithMany().HasForeignKey("UserId"),
                    j =>
                    {
                        j.HasKey("UserId", "RoleId");
                        j.ToTable("AspNetUserRoles");
                        j.HasIndex(new[] { "RoleId" }, "IX_AspNetUserRoles_RoleId");
                    });
        });

        modelBuilder.Entity<AspirantPayment>(entity =>
        {
            // Idempotency key: the same captured Razorpay payment can never be attributed to two
            // different AspirantPayment rows. Filtered because almost every row is Pending with a
            // null RazorpayPaymentId, and SQL Server only allows one NULL in a plain unique index.
            entity.HasIndex(e => e.RazorpayPaymentId, "IX_AspirantPayments_RazorpayPaymentId_Unique")
                .IsUnique()
                .HasFilter("([RazorpayPaymentId] IS NOT NULL)");

            entity.HasOne(d => d.Plan).WithMany(p => p.AspirantPayments).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Test).WithMany(p => p.AspirantPayments).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.User).WithMany(p => p.AspirantPayments).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Attempt>(entity =>
        {
            entity.HasOne(d => d.Test).WithMany(p => p.Attempts).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.User).WithMany(p => p.Attempts).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Blog>(entity =>
        {
            entity.HasOne(d => d.Category).WithMany(p => p.Blogs).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.CreatedBy).WithMany(p => p.Blogs).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(e => e.Icon).HasDefaultValue("");
        });

        modelBuilder.Entity<DailyQuizAttempt>(entity =>
        {
            entity.HasOne(d => d.User).WithMany(p => p.DailyQuizAttempts).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Dispute>(entity =>
        {
            entity.Property(e => e.CreatedDate).HasDefaultValueSql("(getutcdate())");

            // WithMany() with no argument: a real FK/relationship for eager-loading, but no back-
            // collection needed on AspirantPayment/Order for this — avoids touching those entities.
            entity.HasOne(d => d.AspirantPayment).WithMany().HasForeignKey(d => d.AspirantPaymentId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(d => d.Order).WithMany().HasForeignKey(d => d.OrderId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<EmailLog>(entity =>
        {
            entity.Property(e => e.CreatedDate).HasDefaultValueSql("(getutcdate())");
        });

        modelBuilder.Entity<EmployerAcknowledgment>(entity =>
        {
            entity.HasOne(d => d.EmployerProfile).WithMany(p => p.EmployerAcknowledgments).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<EmployerContactLog>(entity =>
        {
            entity.HasOne(d => d.EmployerProfile).WithMany(p => p.EmployerContactLogs).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.CandidateUser).WithMany(p => p.EmployerContactLogsAsCandidate).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<EmployerCredits>(entity =>
        {
            entity.HasOne(d => d.EmployerProfile).WithOne(p => p.EmployerCredits).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<EmployerPayment>(entity =>
        {
            entity.HasOne(d => d.EmployerProfile).WithMany(p => p.EmployerPayments).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Plan).WithMany(p => p.EmployerPayments).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<EmployerProfile>(entity =>
        {
            entity.HasOne(d => d.User).WithOne(p => p.EmployerProfile).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<EmployerSubscription>(entity =>
        {
            entity.HasOne(d => d.Plan).WithMany(p => p.EmployerSubscriptions).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CreditTransaction>(entity =>
        {
            entity.HasOne(d => d.EmployerProfile).WithMany(p => p.CreditTransactions).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.CreatedByUser).WithMany(p => p.CreditTransactionsCreated).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Exam>(entity =>
        {
            entity.HasOne(d => d.Category).WithMany(p => p.Exams).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ExamCalendarEvent>(entity =>
        {
            entity.HasOne(d => d.Category).WithMany(p => p.ExamCalendarEvents).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ExamNotification>(entity =>
        {
            entity.Property(e => e.State).HasDefaultValue("");
        });

        modelBuilder.Entity<GovtScheme>(entity =>
        {
            entity.HasOne(d => d.CreatedBy).WithMany(p => p.GovtSchemes).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<HistoricalCutoff>(entity =>
        {
            entity.HasOne(d => d.Exam).WithMany(p => p.HistoricalCutoffs).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<InAppNotification>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedNever();
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.Property(e => e.ApplicationMode).HasDefaultValue("Online");
            entity.Property(e => e.IsNew).HasDefaultValue(true);
            entity.Property(e => e.PostedDate).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.State).HasDefaultValue("Gujarat");
            entity.Property(e => e.TotalPosts).HasDefaultValue(1);

            entity.HasOne(d => d.Category).WithMany(p => p.Jobs).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.CreatedBy).WithMany(p => p.Jobs).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<JobAlert>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.Frequency).HasDefaultValue("Daily");
        });

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.HasOne(d => d.ApplicantUser).WithMany(p => p.JobApplications).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<JobDraftQueue>(entity =>
        {
            entity.HasOne(d => d.CreatedJob).WithMany(p => p.JobDraftQueues).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.FeedSource).WithMany(p => p.JobDraftQueues).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.SuggestedCategory).WithMany(p => p.JobDraftQueues).OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.SourcePostKey, "IX_JobDraftQueue_SourcePostKey")
                .IsUnique()
                .HasFilter("[SourcePostKey] IS NOT NULL");
        });

        modelBuilder.Entity<JobFeedSource>(entity =>
        {
            entity.HasOne(d => d.DefaultCategory).WithMany(p => p.JobFeedSources).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<JobPost>(entity =>
        {
            entity.Property(e => e.Vacancies).HasDefaultValue(1);
        });

        modelBuilder.Entity<JobSeekerProfile>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedNever();
        });

        modelBuilder.Entity<News>(entity =>
        {
            entity.HasOne(d => d.Category).WithMany(p => p.News).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.CreatedBy).WithMany(p => p.News).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<OldPaper>(entity =>
        {
            entity.HasOne(d => d.Category).WithMany(p => p.OldPapers).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.CreatedBy).WithMany(p => p.OldPapers).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            // Same idempotency guarantee as AspirantPayment above, for the store-checkout order table.
            entity.HasIndex(e => e.RazorpayPaymentId, "IX_Orders_RazorpayPaymentId_Unique")
                .IsUnique()
                .HasFilter("([RazorpayPaymentId] IS NOT NULL)");

            entity.Property(e => e.OrderDate).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.PaymentStatus).HasDefaultValue("Pending");

            entity.HasOne(d => d.User).WithMany(u => u.Orders)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasIndex(e => e.DownloadToken, "IX_OrderItems_DownloadToken")
                .IsUnique()
                .HasFilter("([DownloadToken] IS NOT NULL)");

            entity.Property(e => e.MaxDownloadCount).HasDefaultValue(3);
            entity.Property(e => e.Quantity).HasDefaultValue(1);

            entity.HasOne(d => d.Product).WithMany(p => p.OrderItems).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<PaymentLog>(entity =>
        {
            entity.Property(e => e.CreatedDate).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsSuccess).HasDefaultValue(true);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(e => e.CreatedDate).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.IsFree).HasDefaultValue(true);
        });

        modelBuilder.Entity<ProductDownload>(entity =>
        {
            entity.Property(e => e.DownloadDate).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.DownloadType).HasDefaultValue("free");
            entity.Property(e => e.IsSuccessful).HasDefaultValue(true);
        });

        modelBuilder.Entity<ProductReview>(entity =>
        {
            entity.Property(e => e.CreatedDate).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.Order).WithMany(p => p.ProductReviewOrders).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<PushSubscription>(entity =>
        {
            entity.HasOne(d => d.User).WithMany(p => p.PushSubscriptions).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasOne(d => d.Exam).WithMany(p => p.Questions).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Section).WithMany(p => p.Questions).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ReferralTracking>(entity =>
        {
            entity.HasOne(d => d.User).WithMany(p => p.ReferralTrackings).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Response>(entity =>
        {
            entity.HasOne(d => d.Question).WithMany(p => p.Responses).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Result>(entity =>
        {
            entity.Property(e => e.CreatedById).HasDefaultValue("");
            entity.Property(e => e.State).HasDefaultValue("");
        });

        modelBuilder.Entity<ResultsAnalytic>(entity =>
        {
            entity.HasOne(d => d.Test).WithMany(p => p.ResultsAnalytics).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.User).WithMany(p => p.ResultsAnalytics).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasOne(d => d.Payment).WithMany(p => p.Subscriptions).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Plan).WithMany(p => p.Subscriptions).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.User).WithMany(p => p.Subscriptions).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Syllabuse>(entity =>
        {
            entity.HasOne(d => d.Category).WithMany(p => p.Syllabuses).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.CreatedBy).WithMany(p => p.Syllabuses).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Test>(entity =>
        {
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.HasOne(d => d.Exam).WithMany(p => p.Tests).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<TestPurchase>(entity =>
        {
            entity.HasOne(d => d.Payment).WithMany(p => p.TestPurchases).OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Test).WithMany(p => p.TestPurchases).OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.User).WithMany(p => p.TestPurchases).OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<WalletCredit>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedNever();
        });

        modelBuilder.Entity<WalletTransaction>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedNever();
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
