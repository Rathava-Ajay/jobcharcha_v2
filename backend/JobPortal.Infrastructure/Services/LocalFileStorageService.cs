using JobPortal.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace JobPortal.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _rootPath;
    private readonly string _publicBasePath;

    public LocalFileStorageService(IConfiguration config)
    {
        var configuredRoot = config["FileStorage:RootPath"] ?? "wwwroot/uploads";
        _rootPath = Path.IsPathRooted(configuredRoot)
            ? configuredRoot
            : Path.Combine(AppContext.BaseDirectory, configuredRoot);
        _publicBasePath = config["FileStorage:PublicBasePath"] ?? "/uploads";
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType, string folder)
    {
        var safeFolder = folder.Trim('/');
        var targetDir = Path.Combine(_rootPath, safeFolder);
        Directory.CreateDirectory(targetDir);

        var ext = Path.GetExtension(fileName);
        var uniqueName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(targetDir, uniqueName);

        await using (var output = File.Create(fullPath))
        {
            await fileStream.CopyToAsync(output);
        }

        return $"{_publicBasePath}/{safeFolder}/{uniqueName}";
    }

    public void Delete(string relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl) || !relativeUrl.StartsWith(_publicBasePath))
            return;

        var relative = relativeUrl[_publicBasePath.Length..].TrimStart('/');
        var fullPath = Path.Combine(_rootPath, relative);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }
}
