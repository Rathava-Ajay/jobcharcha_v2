using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployerJobModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "EmployerJobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedByUserId",
                table: "EmployerJobs",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DuplicateFingerprint",
                table: "EmployerJobs",
                type: "nvarchar(600)",
                maxLength: 600,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "EmployerJobs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployerJobs_DuplicateFingerprint",
                table: "EmployerJobs",
                column: "DuplicateFingerprint");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EmployerJobs_DuplicateFingerprint",
                table: "EmployerJobs");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "EmployerJobs");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "EmployerJobs");

            migrationBuilder.DropColumn(
                name: "DuplicateFingerprint",
                table: "EmployerJobs");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "EmployerJobs");
        }
    }
}
