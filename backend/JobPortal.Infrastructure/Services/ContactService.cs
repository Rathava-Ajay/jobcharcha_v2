using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Contact;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;

namespace JobPortal.Infrastructure.Services;

public class ContactService : IContactService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public ContactService(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<ServiceResult> SubmitAsync(ContactSubmitRequest request, string? ipAddress, string? userAgent)
    {
        var entity = new Contact
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Phone = request.Phone,
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            IsRead = false,
            IsReplied = false,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        _db.Contacts.Add(entity);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditEntry
        {
            EventType = AuditEventTypes.ContactSubmitted,
            Category = AuditEventTypes.Categories.Contact,
            Summary = $"Contact form: \"{entity.Subject}\" — from {entity.Name} <{entity.Email}>",
            ActorEmail = entity.Email,
            TargetType = "Contact",
            TargetId = entity.Id.ToString(),
            Metadata = new { subject = entity.Subject, phone = entity.Phone },
        });

        return ServiceResult.Ok();
    }
}
