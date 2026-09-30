using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddResultAiSeoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CutOffBreakdownJson",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FaqSchemaJson",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FocusKeyword",
                table: "Results",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InternalLinkAnchorsJson",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LsiKeywordsJson",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OgDescription",
                table: "Results",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OgTitle",
                table: "Results",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryKeywordsJson",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShortDescription",
                table: "Results",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CutOffBreakdownJson",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "FaqSchemaJson",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "FocusKeyword",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "InternalLinkAnchorsJson",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "LsiKeywordsJson",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "OgDescription",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "OgTitle",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "SecondaryKeywordsJson",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "ShortDescription",
                table: "Results");
        }
    }
}
