namespace JobPortal.Application.Interfaces;

/// <summary>
/// Abstraction over file storage. Phase 1 implementation writes to local disk;
/// swap for a Cloudflare R2-backed implementation later without touching callers.
/// </summary>
public interface IFileStorageService
{
    Task<string> SaveAsync(Stream fileStream, string fileName, string contentType, string folder);
    void Delete(string relativeUrl);
}
