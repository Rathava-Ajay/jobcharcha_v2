using JobPortal.Application.DTOs.News;
using JobPortal.Infrastructure.Data.Entities;
using JobPortal.Infrastructure.Services;
using JobPortal.Tests.TestSupport;

namespace JobPortal.Tests;

public class NewsCategoryValidationTests
{
    private static async Task<NewsService> SeedAsync()
    {
        var db = TestDb.Create(TestDb.NewDbName());
        db.Categories.AddRange(
            new Category { Id = 1, Name = "SSC Jobs", Slug = "ssc-jobs", Icon = "x", CreatedDate = DateTime.UtcNow, IsActive = true },
            new Category { Id = 2, Name = "Engineering Jobs", Slug = "engineering-jobs", Icon = "x", CreatedDate = DateTime.UtcNow, IsActive = true });
        await db.SaveChangesAsync();
        return new NewsService(db);
    }

    private static UpsertNewsRequest Req(int? categoryId) => new() { Title = "SSC CGL notice", Summary = "s", Content = "c", CategoryId = categoryId };

    [Fact]
    public async Task Create_WithoutCategory_IsRejected()
    {
        var result = await (await SeedAsync()).CreateAsync(Req(null), "u");
        Assert.False(result.Succeeded);
        Assert.Equal("CategoryRequired", result.ErrorCode);
    }

    [Fact]
    public async Task Create_WithCategoryOutsideTheAllowedList_IsRejected()
    {
        var result = await (await SeedAsync()).CreateAsync(Req(2), "u"); // Engineering Jobs
        Assert.False(result.Succeeded);
        Assert.Equal("InvalidCategory", result.ErrorCode);
        Assert.Contains("SSC Jobs", result.Error);
    }

    [Fact]
    public async Task Create_WithAllowedCategory_Succeeds_AndUpdateEnforcesTheSameRule()
    {
        var service = await SeedAsync();
        var created = await service.CreateAsync(Req(1), "u");
        Assert.True(created.Succeeded, created.Error);

        var bad = await service.UpdateAsync(created.Data!.Id, Req(2), "u");
        Assert.Equal("InvalidCategory", bad.ErrorCode);
    }

    [Fact]
    public async Task AllowedCategories_ListsOnlyAllowedActiveOnes()
    {
        var list = await (await SeedAsync()).GetAllowedCategoriesAsync();
        Assert.Contains("SSC Jobs", list.Select(c => c.Name));
        Assert.DoesNotContain("Engineering Jobs", list.Select(c => c.Name));
    }
}
