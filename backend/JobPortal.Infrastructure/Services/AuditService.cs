using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using JobPortal.Application.Common;
using JobPortal.Application.DTOs.Audit;
using JobPortal.Application.DTOs.Jobs;
using JobPortal.Application.Interfaces;
using JobPortal.Infrastructure.Data;
using JobPortal.Infrastructure.Data.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(AuditEntry entry, CancellationToken ct = default)
    {
        try
        {
            var http = _httpContextAccessor.HttpContext;
            var user = http?.User;

            var actorUserId = entry.ActorUserId
                ?? user?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user?.FindFirstValue(JwtRegisteredClaimNames.Sub);
            var actorEmail = entry.ActorEmail
                ?? user?.FindFirstValue(ClaimTypes.Email)
                ?? user?.FindFirstValue(JwtRegisteredClaimNames.Email);
            var actorRole = entry.ActorRole ?? user?.FindFirstValue(ClaimTypes.Role);

            var row = new AuditEvent
            {
                EventType = Trunc(entry.EventType, 60)!,
                Category = Trunc(entry.Category, 30)!,
                Summary = Trunc(entry.Summary, 300)!,
                ActorUserId = Trunc(actorUserId, 450),
                ActorEmail = Trunc(actorEmail, 200),
                ActorRole = Trunc(actorRole, 40),
                TargetType = Trunc(entry.TargetType, 60),
                TargetId = Trunc(entry.TargetId, 450),
                MetadataJson = entry.Metadata is null ? null : JsonSerializer.Serialize(entry.Metadata),
                IpAddress = Trunc(http?.Connection.RemoteIpAddress?.ToString(), 64),
                UserAgent = Trunc(http?.Request.Headers.UserAgent.ToString(), 400),
                CreatedDate = DateTime.UtcNow,
            };

            _db.AuditEvents.Add(row);
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // An audit-trail write must never break the user action it is recording.
            Debug.WriteLine($"[AuditService] failed to record '{entry.EventType}': {ex.Message}");
        }
    }

    public async Task<PagedResult<AuditEventDto>> QueryAsync(AuditQuery query)
    {
        var q = from e in _db.AuditEvents.AsNoTracking()
                join u in _db.AspNetUsers.AsNoTracking() on e.ActorUserId equals u.Id into gj
                from u in gj.DefaultIfEmpty()
                select new { e, ActorName = u == null ? null : (u.FirstName + " " + u.LastName).Trim() };

        if (!string.IsNullOrWhiteSpace(query.Category))
            q = q.Where(x => x.e.Category == query.Category);
        if (!string.IsNullOrWhiteSpace(query.EventType))
            q = q.Where(x => x.e.EventType == query.EventType);
        if (query.From.HasValue)
            q = q.Where(x => x.e.CreatedDate >= query.From.Value);
        if (query.To.HasValue)
            q = q.Where(x => x.e.CreatedDate <= query.To.Value);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(x => x.e.Summary.Contains(s)
                || (x.e.ActorEmail != null && x.e.ActorEmail.Contains(s))
                || (x.ActorName != null && x.ActorName.Contains(s)));
        }

        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 100 ? 25 : query.PageSize;

        var totalCount = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.e.CreatedDate).ThenByDescending(x => x.e.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new AuditEventDto
            {
                Id = x.e.Id,
                EventType = x.e.EventType,
                Category = x.e.Category,
                Summary = x.e.Summary,
                ActorUserId = x.e.ActorUserId,
                ActorName = string.IsNullOrWhiteSpace(x.ActorName) ? null : x.ActorName,
                ActorEmail = x.e.ActorEmail,
                ActorRole = x.e.ActorRole,
                TargetType = x.e.TargetType,
                TargetId = x.e.TargetId,
                MetadataJson = x.e.MetadataJson,
                IpAddress = x.e.IpAddress,
                CreatedDate = x.e.CreatedDate,
            }).ToListAsync();

        return new PagedResult<AuditEventDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<List<SignupSourceStatDto>> GetSignupSourceBreakdownAsync(DateTime? from, DateTime? to)
    {
        var q = _db.AspNetUsers.AsNoTracking().Include(u => u.Roles).Where(u => !u.IsDeleted);
        if (from.HasValue) q = q.Where(u => u.CreatedDate >= from.Value);
        if (to.HasValue) q = q.Where(u => u.CreatedDate <= to.Value);

        var users = await q.Select(u => new { u.SignupSource, RoleNames = u.Roles.Select(r => r.Name) }).ToListAsync();

        return users
            .GroupBy(u => string.IsNullOrWhiteSpace(u.SignupSource) ? "organic" : u.SignupSource!)
            .Select(g =>
            {
                var roles = g.Select(x => RoleMapper.ToUiRole(RoleMapper.ResolveDbRole(x.RoleNames))).ToList();
                return new SignupSourceStatDto
                {
                    Source = g.Key,
                    Aspirants = roles.Count(r => r == "aspirant"),
                    Employers = roles.Count(r => r == "employer"),
                    Other = roles.Count(r => r != "aspirant" && r != "employer"),
                    Total = g.Count(),
                };
            })
            .OrderByDescending(s => s.Total)
            .ToList();
    }

    private static string? Trunc(string? value, int max) =>
        string.IsNullOrEmpty(value) ? value : value.Length <= max ? value : value[..max];
}
