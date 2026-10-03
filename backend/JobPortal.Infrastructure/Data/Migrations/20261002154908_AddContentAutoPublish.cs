using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContentAutoPublish : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoPublished",
                table: "ContentDrafts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AutoPublish",
                table: "ContentCategorySettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AutoPublishUserId",
                table: "ContentCategorySettings",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoPublished",
                table: "ContentDrafts");

            migrationBuilder.DropColumn(
                name: "AutoPublish",
                table: "ContentCategorySettings");

            migrationBuilder.DropColumn(
                name: "AutoPublishUserId",
                table: "ContentCategorySettings");
        }
    }
}
