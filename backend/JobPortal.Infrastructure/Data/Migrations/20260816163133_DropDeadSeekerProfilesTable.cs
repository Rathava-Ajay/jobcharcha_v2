using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DropDeadSeekerProfilesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Confirmed zero rows and zero code references anywhere in the app (superseded by
            // JobSeekerProfile). The Hangfire tables the scaffold diff also wanted to drop are
            // deliberately left alone here — that's tied to the still-open A7 decision (adopt
            // Hangfire for real vs. remove the package entirely), not part of this cleanup.
            migrationBuilder.DropTable(
                name: "SeekerProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SeekerProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CurrentSalary = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ExpectedSalary = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ExperienceYears = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Headline = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    HideEmail = table.Column<bool>(type: "bit", nullable: false),
                    HidePhone = table.Column<bool>(type: "bit", nullable: false),
                    HighestQualification = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsProfilePublic = table.Column<bool>(type: "bit", nullable: false),
                    NoticePeriod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PhotoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PreferredJobTypes = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PreferredLocations = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ResumeFileName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ResumeUploadedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResumeUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Skills = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Specialization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeekerProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeekerProfiles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_SeekerProfiles_IsProfilePublic",
                table: "SeekerProfiles",
                column: "IsProfilePublic");

            migrationBuilder.CreateIndex(
                name: "IX_SeekerProfiles_UserId",
                table: "SeekerProfiles",
                column: "UserId",
                unique: true);
        }
    }
}
