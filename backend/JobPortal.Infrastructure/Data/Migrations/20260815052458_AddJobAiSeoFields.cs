using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobAiSeoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExamPatternJson",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FaqSchemaJson",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FocusKeyword",
                table: "Jobs",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImportantDatesJson",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InternalLinkAnchorsJson",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LsiKeywordsJson",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OgDescription",
                table: "Jobs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OgTitle",
                table: "Jobs",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SalaryBreakdownJson",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryKeywordsJson",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExamPatternJson",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "FaqSchemaJson",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "FocusKeyword",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ImportantDatesJson",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "InternalLinkAnchorsJson",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "LsiKeywordsJson",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "OgDescription",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "OgTitle",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "SalaryBreakdownJson",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "SecondaryKeywordsJson",
                table: "Jobs");
        }
    }
}
