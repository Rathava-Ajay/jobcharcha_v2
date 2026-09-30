using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAdmitCardAiSeoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FaqSchemaJson",
                table: "AdmitCards",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FocusKeyword",
                table: "AdmitCards",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InternalLinkAnchorsJson",
                table: "AdmitCards",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LsiKeywordsJson",
                table: "AdmitCards",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OgDescription",
                table: "AdmitCards",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OgTitle",
                table: "AdmitCards",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryKeywordsJson",
                table: "AdmitCards",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShortDescription",
                table: "AdmitCards",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FaqSchemaJson",
                table: "AdmitCards");

            migrationBuilder.DropColumn(
                name: "FocusKeyword",
                table: "AdmitCards");

            migrationBuilder.DropColumn(
                name: "InternalLinkAnchorsJson",
                table: "AdmitCards");

            migrationBuilder.DropColumn(
                name: "LsiKeywordsJson",
                table: "AdmitCards");

            migrationBuilder.DropColumn(
                name: "OgDescription",
                table: "AdmitCards");

            migrationBuilder.DropColumn(
                name: "OgTitle",
                table: "AdmitCards");

            migrationBuilder.DropColumn(
                name: "SecondaryKeywordsJson",
                table: "AdmitCards");

            migrationBuilder.DropColumn(
                name: "ShortDescription",
                table: "AdmitCards");
        }
    }
}
