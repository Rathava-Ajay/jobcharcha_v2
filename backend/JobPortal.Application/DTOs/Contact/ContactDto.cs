using System.ComponentModel.DataAnnotations;
using JobPortal.Application.Common;

namespace JobPortal.Application.DTOs.Contact;

public class ContactSubmitRequest
{
    [Required, StringLength(100, MinimumLength = 2)]
    [RegularExpression(ValidationPatterns.PersonNamePattern, ErrorMessage = ValidationPatterns.PersonNameErrorMessage)]
    public string Name { get; set; } = null!;

    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    public string? Phone { get; set; }

    [Required, StringLength(300)]
    public string Subject { get; set; } = null!;

    [Required, StringLength(4000)]
    public string Message { get; set; } = null!;
}
