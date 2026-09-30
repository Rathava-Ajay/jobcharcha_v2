using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Tests;

public class JobServiceBulkImportExportTests
{
    private static async Task<(JobService Service, JobPortal.Infrastructure.Data.AppDbContext Db)> SeedAsync(string dbName)
    {
        var db = TestDb.Create(dbName);
        db.Categories.Add(new Category { Id = 1, Name = "Bank Jobs", Slug = "bank-jobs", Icon = "bank", CreatedDate = DateTime.UtcNow, IsActive = true });
        db.AspNetUsers.Add(new AspNetUser { Id = "admin-1", FirstName = "Admin", LastName = "User", CreatedDate = DateTime.UtcNow });
        await db.SaveChangesAsync();
        var service = new JobService(db, new FakeBackgroundTaskQueue());
        return (service, db);
    }

    [Fact]
    public async Task BulkImportAsync_AllValidRows_CreatesAllJobs()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName());
        var csv = "Title,OrganizationName,CategoryId,LastDate\n"
            + "GPSC Class 1-2-3,GPSC,1,2026-12-31\n"
            + "Talati Recruitment,GSSSB,1,2026-11-30\n";

        var result = await service.BulkImportAsync(csv, "admin-1");

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(2, result.SuccessCount);
        Assert.Equal(0, result.FailureCount);
        Assert.Empty(result.Errors);
        Assert.Equal(2, await db.Jobs.CountAsync());
    }

    [Fact]
    public async Task BulkImportAsync_MissingRequiredField_FailsThatRowWithRowNumberButKeepsOthers()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName());
        var csv = "Title,OrganizationName,CategoryId,LastDate\n"
            + ",GPSC,1,2026-12-31\n" // row 2: missing Title
            + "Talati Recruitment,GSSSB,1,2026-11-30\n"; // row 3: valid

        var result = await service.BulkImportAsync(csv, "admin-1");

        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.SuccessCount);
        Assert.Equal(1, result.FailureCount);
        Assert.Equal(2, result.Errors[0].RowNumber);
        Assert.Contains("Title", result.Errors[0].Error);
        Assert.Equal(1, await db.Jobs.CountAsync());
    }

    [Fact]
    public async Task BulkImportAsync_InvalidCategoryId_ReusesCreateAsyncValidation()
    {
        var (service, _) = await SeedAsync(TestDb.NewDbName());
        var csv = "Title,OrganizationName,CategoryId,LastDate\nBackend Engineer,Acme,999,2026-12-31\n";

        var result = await service.BulkImportAsync(csv, "admin-1");

        Assert.Equal(1, result.FailureCount);
        Assert.Contains("Category", result.Errors[0].Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task BulkImportAsync_DuplicateWithinSameFile_SecondRowRejectedByExistingDuplicateCheck()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName());
        var csv = "Title,OrganizationName,CategoryId,LastDate\n"
            + "GPSC Class 1-2-3,GPSC,1,2026-12-31\n"
            + "GPSC Class 1-2-3,GPSC,1,2026-12-31\n"; // exact duplicate: title+org+lastDate fingerprint

        var result = await service.BulkImportAsync(csv, "admin-1");

        Assert.Equal(1, result.SuccessCount);
        Assert.Equal(1, result.FailureCount);
        Assert.Equal(1, await db.Jobs.CountAsync());
    }

    [Fact]
    public async Task ExportCsvAsync_RoundTripsThroughCsvUtilParse()
    {
        var (service, db) = await SeedAsync(TestDb.NewDbName());
        await service.BulkImportAsync(
            "Title,OrganizationName,CategoryId,LastDate,Location\nGPSC Class 1-2-3,GPSC,1,2026-12-31,\"Ahmedabad, Gujarat\"\n",
            "admin-1");

        var csv = await service.ExportCsvAsync();
        var rows = JobPortal.Application.Common.CsvUtil.Parse(csv);

        Assert.Single(rows);
        Assert.Equal("GPSC Class 1-2-3", rows[0]["Title"]);
        Assert.Equal("GPSC", rows[0]["OrganizationName"]);
        Assert.Equal("Ahmedabad, Gujarat", rows[0]["Location"]);
    }
}
