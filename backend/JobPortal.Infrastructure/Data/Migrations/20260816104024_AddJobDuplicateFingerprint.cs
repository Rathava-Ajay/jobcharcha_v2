using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobDuplicateFingerprint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DuplicateFingerprint",
                table: "Jobs",
                type: "nvarchar(700)",
                maxLength: 700,
                nullable: false,
                defaultValue: "");

            // Backfill existing rows with a real fingerprint before the unique index is created —
            // the default "" placeholder above would collide across every pre-existing row otherwise.
            migrationBuilder.Sql(@"
                UPDATE Jobs
                SET DuplicateFingerprint = LOWER(LTRIM(RTRIM(Title))) + '|' + LOWER(LTRIM(RTRIM(OrganizationName))) + '|' + CONVERT(varchar(10), LastDate, 120)
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_DuplicateFingerprint",
                table: "Jobs",
                column: "DuplicateFingerprint",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Jobs_DuplicateFingerprint",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "DuplicateFingerprint",
                table: "Jobs");
        }
    }
}
