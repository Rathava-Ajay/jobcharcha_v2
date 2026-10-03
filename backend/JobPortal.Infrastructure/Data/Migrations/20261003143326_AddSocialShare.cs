using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialShare : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SocialImageUsages",
                columns: table => new
                {
                    Day = table.Column<DateTime>(type: "date", nullable: false),
                    Count = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialImageUsages", x => x.Day);
                });

            migrationBuilder.CreateTable(
                name: "SocialShareJobs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Category = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Generation = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Attempts = table.Column<int>(type: "int", nullable: false),
                    NextAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DetailsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExternalId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Error = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Trigger = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    RequestedById = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PostedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialShareJobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SocialShareSettings",
                columns: table => new
                {
                    Category = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TelegramEnabled = table.Column<bool>(type: "bit", nullable: false),
                    InstagramEnabled = table.Column<bool>(type: "bit", nullable: false),
                    FacebookEnabled = table.Column<bool>(type: "bit", nullable: false),
                    RequireApproval = table.Column<bool>(type: "bit", nullable: false),
                    TelegramTemplate = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CaptionTemplate = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Hashtags = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ImageStyle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ImageSize = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    BrandColor = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    AccentColor = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialShareSettings", x => x.Category);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SocialShareJobs_Status_NextAttemptAt",
                table: "SocialShareJobs",
                columns: new[] { "Status", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "UX_SocialShareJobs_Post",
                table: "SocialShareJobs",
                columns: new[] { "Category", "EntityId", "Channel", "Generation" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SocialImageUsages");

            migrationBuilder.DropTable(
                name: "SocialShareJobs");

            migrationBuilder.DropTable(
                name: "SocialShareSettings");
        }
    }
}
