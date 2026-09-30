using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Contact;

namespace JobPortal.Application.Interfaces;

public interface IContactService
{
    Task<ServiceResult> SubmitAsync(ContactSubmitRequest request, string? ipAddress, string? userAgent);
}
