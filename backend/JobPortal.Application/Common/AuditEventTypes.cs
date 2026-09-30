namespace JobPortal.Application.Common;

/// <summary>
/// Stable machine keys for <c>AuditEvent.EventType</c> / <c>AuditEvent.Category</c>. Centralized so
/// the instrumentation call sites and the admin filter dropdowns never drift apart — the frontend
/// gets this list from <c>GET /api/admin/audit/categories</c> rather than duplicating the strings.
/// </summary>
public static class AuditEventTypes
{
    public static class Categories
    {
        public const string Auth = "Auth";
        public const string Billing = "Billing";
        public const string Contact = "Contact";
        public const string Alerts = "Alerts";
        public const string Store = "Store";
        public const string Employer = "Employer";
    }

    // Auth
    public const string AspirantRegistered = "aspirant.registered";
    public const string EmployerRegistered = "employer.registered";

    // Contact
    public const string ContactSubmitted = "contact.submitted";

    // Alerts
    public const string JobAlertSubscribed = "jobalert.subscribed";

    // Billing
    public const string SubscriptionPurchased = "subscription.purchased";
    public const string WalletTopUp = "wallet.topup";

    // Store
    public const string StoreOrderPaid = "store.order.paid";

    // Employer
    public const string EmployerJobCreated = "employerjob.created";
    public const string JobApplicationSubmitted = "jobapplication.submitted";

    /// <summary>Category → its event types, for the admin filter UI.</summary>
    public static readonly IReadOnlyList<AuditCategoryFacet> Catalog = new[]
    {
        new AuditCategoryFacet(Categories.Auth, new[] { AspirantRegistered, EmployerRegistered }),
        new AuditCategoryFacet(Categories.Billing, new[] { SubscriptionPurchased, WalletTopUp }),
        new AuditCategoryFacet(Categories.Contact, new[] { ContactSubmitted }),
        new AuditCategoryFacet(Categories.Alerts, new[] { JobAlertSubscribed }),
        new AuditCategoryFacet(Categories.Store, new[] { StoreOrderPaid }),
        new AuditCategoryFacet(Categories.Employer, new[] { EmployerJobCreated, JobApplicationSubmitted }),
    };
}

public record AuditCategoryFacet(string Category, string[] EventTypes);
