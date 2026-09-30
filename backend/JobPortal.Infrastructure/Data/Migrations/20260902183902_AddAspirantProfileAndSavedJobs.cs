using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAspirantProfileAndSavedJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "JobSeekerProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EducationJson",
                table: "JobSeekerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "JobSeekerProfiles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "JobPreferencesJson",
                table: "JobSeekerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProfileCompletedAt",
                table: "JobSeekerProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResumeUploadedAt",
                table: "JobSeekerProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkillsJson",
                table: "JobSeekerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkExperienceJson",
                table: "JobSeekerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SavedJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    EmployerJobId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedJobs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SavedJobs_EmployerJobs_EmployerJobId",
                        column: x => x.EmployerJobId,
                        principalTable: "EmployerJobs",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_SavedJobs_EmployerJobId",
                table: "SavedJobs",
                column: "EmployerJobId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedJobs_UserId_EmployerJobId",
                table: "SavedJobs",
                columns: new[] { "UserId", "EmployerJobId" },
                unique: true);

            // Application-status vocabulary change: "Viewed" -> "UnderReview", "Hired" -> "Selected"
            // (see JobPortal.Application/Common/ApplicationStatuses.cs). Bring existing rows forward.
            migrationBuilder.Sql("UPDATE [JobApplications] SET [Status] = 'UnderReview' WHERE [Status] = 'Viewed';");
            migrationBuilder.Sql("UPDATE [JobApplications] SET [Status] = 'Selected' WHERE [Status] = 'Hired';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE [JobApplications] SET [Status] = 'Viewed' WHERE [Status] = 'UnderReview';");
            migrationBuilder.Sql("UPDATE [JobApplications] SET [Status] = 'Hired' WHERE [Status] = 'Selected';");

            migrationBuilder.DropTable(
                name: "SavedJobs");

            migrationBuilder.DropColumn(
                name: "District",
                table: "JobSeekerProfiles");

            migrationBuilder.DropColumn(
                name: "EducationJson",
                table: "JobSeekerProfiles");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "JobSeekerProfiles");

            migrationBuilder.DropColumn(
                name: "JobPreferencesJson",
                table: "JobSeekerProfiles");

            migrationBuilder.DropColumn(
                name: "ProfileCompletedAt",
                table: "JobSeekerProfiles");

            migrationBuilder.DropColumn(
                name: "ResumeUploadedAt",
                table: "JobSeekerProfiles");

            migrationBuilder.DropColumn(
                name: "SkillsJson",
                table: "JobSeekerProfiles");

            migrationBuilder.DropColumn(
                name: "WorkExperienceJson",
                table: "JobSeekerProfiles");
        }
    }
}
