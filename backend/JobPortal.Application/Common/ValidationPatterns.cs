namespace JobPortal.Application.Common;

public static class ValidationPatterns
{
    /// <summary>
    /// Letters (any script), combining marks, spaces, periods, apostrophes, and hyphens —
    /// covers real names ("O'Brien", "Jean-Luc", "Rāhul") while rejecting digits/symbols/emoji.
    /// </summary>
    public const string PersonNamePattern = @"^[\p{L}\p{M}\s.'-]+$";
    public const string PersonNameErrorMessage = "Must contain only letters, spaces, periods, apostrophes, or hyphens.";
}
