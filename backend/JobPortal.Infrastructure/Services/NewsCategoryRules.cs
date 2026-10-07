namespace JobPortal.Infrastructure.Services;

/// <summary>
/// The categories a news article may be filed under (matched on Category.Slug). News shares the Categories table
/// with jobs, which holds job-type buckets like "Engineering Jobs" or "Private Company Jobs"; those would mislabel
/// exam and recruitment news, so only exam/recruitment-oriented ones are allowed here. Edit this one list to change it.
/// </summary>
public static class NewsCategoryRules
{
    public static readonly IReadOnlySet<string> AllowedSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "exam-preparation---study-material", "admit-card", "result-answer-key", "syllabus-exam-pattern",
        "ojas-jobs", "gpsc-jobs", "gsssb-jobs", "police-jobs", "talati-clerk-jobs", "ssc-jobs", "upsc-jobs",
        "railway-jobs", "bank-jobs", "teaching-jobs", "anganwadi-jobs", "health-nhm-jobs", "forest-guard-jobs",
        "defence-army-jobs", "court-judiciary-jobs", "panchayat-gram-sevak-jobs", "municipal-nagar-palika-jobs",
        "post-office-postal-jobs", "central-government-jobs", "gujarat-state-government-jobs",
    };
}
