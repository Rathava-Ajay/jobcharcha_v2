namespace JobPortal.Tests.TestSupport;

/// <summary>News must be filed under an allowed category (NewsCategoryRules). TestDb.Create seeds this one so
/// fixtures that publish news only need to pass <see cref="CategoryId"/>.</summary>
public static class NewsTestData
{
    public const int CategoryId = 9001;
    public const string Slug = "exam-preparation---study-material";
}
