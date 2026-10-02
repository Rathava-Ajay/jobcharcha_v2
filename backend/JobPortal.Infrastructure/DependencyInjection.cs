using JobPortal.Application.Common;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JobPortal.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RazorpaySettings>(configuration.GetSection("Razorpay"));
        services.AddHttpClient<IRazorpayClient, RazorpayClient>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IAspirantPlanService, AspirantPlanService>();
        services.AddScoped<IEmployerContextService, EmployerContextService>();
        services.AddScoped<IEmployerPlanService, EmployerPlanService>();
        services.AddScoped<IEmployerCandidateService, EmployerCandidateService>();
        services.AddScoped<IEmployerContactService, EmployerContactService>();
        services.AddScoped<IEmployerBillingService, EmployerBillingService>();
        services.AddScoped<IEmployerAdminAuditService, EmployerAdminAuditService>();

        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IJobService, JobService>();
        services.AddScoped<IJobFeedSourceService, JobFeedSourceService>();
        services.AddScoped<IJobDraftQueueService, JobDraftQueueService>();
        services.AddScoped<IWatcherAgentSyncService, WatcherAgentSyncService>();
        services.AddScoped<IContentDraftService, ContentDraftService>();
        services.AddScoped<IContentSourceService, ContentSourceService>();
        services.AddHttpClient(ContentLinkChecker.ClientName, c => c.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; JobCharchaLinkCheck/1.0)"))
            .ConfigurePrimaryHttpMessageHandler(() => new System.Net.Http.HttpClientHandler
            {
                AllowAutoRedirect = false, // redirects are followed by hand so every hop can be vetted
                // Existence check only — nothing from the response is used, and many .gov.in sites ship bad certificates.
                ServerCertificateCustomValidationCallback = System.Net.Http.HttpClientHandler.DangerousAcceptAnyServerCertificateValidator,
            });
        services.AddScoped<IContentLinkChecker, ContentLinkChecker>();
        services.AddScoped<IContentSettingsService, ContentSettingsService>();
        services.AddScoped<IContentSyncService, ContentSyncService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IContactService, ContactService>();
        services.AddScoped<IAdmitCardService, AdmitCardService>();
        services.AddScoped<IResultService, ResultService>();
        services.AddScoped<IExamService, ExamService>();
        services.AddScoped<ITestService, TestService>();
        services.AddScoped<ITestAttemptService, TestAttemptService>();
        services.AddScoped<IAlertPreferenceService, AlertPreferenceService>();
        services.AddScoped<IJobAlertDispatchService, JobAlertDispatchService>();
        services.AddScoped<ICutOffService, CutOffService>();
        services.AddScoped<IDailyQuizService, DailyQuizService>();
        services.AddScoped<IOldPaperService, OldPaperService>();
        services.AddScoped<IStudyMaterialService, StudyMaterialService>();
        services.AddScoped<IPracticeQuestionService, PracticeQuestionService>();
        services.AddScoped<IGovtSchemeService, GovtSchemeService>();
        services.AddScoped<INewsService, NewsService>();
        services.AddScoped<IBlogService, BlogService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ISitemapService, SitemapService>();
        services.AddScoped<IEmployerJobService, EmployerJobService>();
        services.AddScoped<IJobApplicationService, JobApplicationService>();
        services.AddScoped<IAspirantProfileService, AspirantProfileService>();
        services.AddScoped<ISavedJobService, SavedJobService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IStoreOrderService, StoreOrderService>();
        services.AddScoped<IWalletService, WalletService>();
        services.AddSingleton<IFileStorageService, LocalFileStorageService>();
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
        services.AddSingleton<IPrerenderSignal, PrerenderSignal>();
        services.AddHttpContextAccessor();
        return services;
    }
}
