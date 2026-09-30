using JobPortal.Application.Common;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

/// <summary>Lighter coverage than JobServiceBulkImportExportTests — same shared CsvUtil pipeline,
/// already thoroughly tested there, so these just confirm each service's own mapping/validation.</summary>
public class BulkImportExportOtherEntitiesTests
{
    private static JobPortal.Infrastructure.Data.AppDbContext SeedDb(string dbName)
    {
        var db = TestDb.Create(dbName);
        db.AspNetUsers.Add(new AspNetUser { Id = "admin-1", FirstName = "Admin", LastName = "User", CreatedDate = DateTime.UtcNow });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task ResultService_BulkImport_ValidRow_Succeeds_ExportRoundTrips()
    {
        var db = SeedDb(TestDb.NewDbName());
        var service = new ResultService(db);

        var importResult = await service.BulkImportAsync("Title,OrganizationName,ResultDate\nSSC CGL 2026 Result,SSC,2026-08-01\n", "admin-1");
        Assert.Equal(1, importResult.SuccessCount);

        var csv = await service.ExportCsvAsync();
        var rows = CsvUtil.Parse(csv);
        Assert.Single(rows);
        Assert.Equal("SSC CGL 2026 Result", rows[0]["Title"]);
    }

    [Fact]
    public async Task ResultService_BulkImport_MissingOrganizationName_Fails()
    {
        var db = SeedDb(TestDb.NewDbName());
        var service = new ResultService(db);

        var result = await service.BulkImportAsync("Title,OrganizationName,ResultDate\nSSC CGL 2026 Result,,2026-08-01\n", "admin-1");

        Assert.Equal(0, result.SuccessCount);
        Assert.Equal(1, result.FailureCount);
        Assert.Contains("OrganizationName", result.Errors[0].Error);
    }

    [Fact]
    public async Task AdmitCardService_BulkImport_ValidRow_Succeeds_ExportRoundTrips()
    {
        var db = SeedDb(TestDb.NewDbName());
        var service = new AdmitCardService(db);

        var importResult = await service.BulkImportAsync("Title,OrganizationName,AdmitCardReleaseDate\nGPSC Admit Card 2026,GPSC,2026-09-01\n", "admin-1");
        Assert.Equal(1, importResult.SuccessCount);

        var csv = await service.ExportCsvAsync();
        var rows = CsvUtil.Parse(csv);
        Assert.Single(rows);
        Assert.Equal("GPSC", rows[0]["OrganizationName"]);
    }

    [Fact]
    public async Task AdmitCardService_BulkImport_MissingTitle_Fails()
    {
        var db = SeedDb(TestDb.NewDbName());
        var service = new AdmitCardService(db);

        var result = await service.BulkImportAsync("Title,OrganizationName\n,GPSC\n", "admin-1");

        Assert.Equal(1, result.FailureCount);
        Assert.Contains("Title", result.Errors[0].Error);
    }

    [Fact]
    public async Task OldPaperService_BulkImport_ValidRow_Succeeds_ExportRoundTrips()
    {
        var db = SeedDb(TestDb.NewDbName());
        var service = new OldPaperService(db);

        var importResult = await service.BulkImportAsync(
            "Title,ExamName,Year,PaperPdfLink\nGPSC Prelim 2025 Paper,GPSC,2025,https://example.com/paper.pdf\n", "admin-1");

        Assert.Equal(1, importResult.SuccessCount);
        var csv = await service.ExportCsvAsync();
        var rows = CsvUtil.Parse(csv);
        Assert.Single(rows);
        Assert.Equal("2025", rows[0]["Year"]);
    }

    [Fact]
    public async Task OldPaperService_BulkImport_InvalidYear_Fails()
    {
        var db = SeedDb(TestDb.NewDbName());
        var service = new OldPaperService(db);

        var result = await service.BulkImportAsync(
            "Title,ExamName,Year,PaperPdfLink\nGPSC Prelim Paper,GPSC,not-a-year,https://example.com/paper.pdf\n", "admin-1");

        Assert.Equal(1, result.FailureCount);
        Assert.Contains("Year", result.Errors[0].Error);
    }

    [Fact]
    public async Task OldPaperService_BulkImport_MissingPaperPdfLink_Fails()
    {
        var db = SeedDb(TestDb.NewDbName());
        var service = new OldPaperService(db);

        var result = await service.BulkImportAsync("Title,ExamName,Year,PaperPdfLink\nGPSC Prelim Paper,GPSC,2025,\n", "admin-1");

        Assert.Equal(1, result.FailureCount);
        Assert.Contains("PaperPdfLink", result.Errors[0].Error);
    }
}
