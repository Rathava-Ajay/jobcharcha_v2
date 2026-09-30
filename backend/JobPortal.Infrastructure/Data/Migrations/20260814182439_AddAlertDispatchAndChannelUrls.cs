using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAlertDispatchAndChannelUrls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TelegramChannelUrl",
                table: "SiteSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppChannelUrl",
                table: "SiteSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AlertDispatchLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AlertPreferenceId = table.Column<int>(type: "int", nullable: false),
                    JobId = table.Column<int>(type: "int", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertDispatchLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlertDispatchLogs_AlertPreferences_AlertPreferenceId",
                        column: x => x.AlertPreferenceId,
                        principalTable: "AlertPreferences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AlertDispatchLogs_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AlertDispatchLogs_AlertPreferenceId_JobId",
                table: "AlertDispatchLogs",
                columns: new[] { "AlertPreferenceId", "JobId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlertDispatchLogs_JobId",
                table: "AlertDispatchLogs",
                column: "JobId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlertDispatchLogs");

            migrationBuilder.DropColumn(
                name: "TelegramChannelUrl",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "WhatsAppChannelUrl",
                table: "SiteSettings");
        }
    }
}
