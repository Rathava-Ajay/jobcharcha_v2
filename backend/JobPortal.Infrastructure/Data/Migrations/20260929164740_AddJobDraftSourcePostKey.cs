using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobDraftSourcePostKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LastFetchSkippedPendingCount",
                table: "JobFeedSources",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LastFetchSkippedReviewedCount",
                table: "JobFeedSources",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SourcePostKey",
                table: "JobDraftQueue",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            // Backfill from the "Advt No: X" prefix the watcher writes into RawContent (mirrors
            // JobDraftQueueService.BuildSourcePostKey). Existing rows already hold repeats of the same
            // post under different DedupeKeys, so only one row per key gets it — the Approved one if
            // any, else the oldest — and the rest stay NULL. Nothing is deleted or re-statused.
            migrationBuilder.Sql(@"
WITH src AS (
    SELECT Id, Status, CreatedDate,
           LTRIM(SUBSTRING(RawContent, CHARINDEX('Advt No:', RawContent) + 8, 250)) AS Tail
    FROM JobDraftQueue
    WHERE CHARINDEX('Advt No:', RawContent) > 0
), keyed AS (
    SELECT Id, Status, CreatedDate,
           LOWER(LEFT(Tail, PATINDEX('%[ |' + CHAR(9) + CHAR(10) + CHAR(13) + ']%', Tail + ' ') - 1)) AS PostKey
    FROM src
), ranked AS (
    SELECT Id, PostKey,
           ROW_NUMBER() OVER (PARTITION BY PostKey
                              ORDER BY CASE WHEN Status = 1 THEN 0 ELSE 1 END, CreatedDate, Id) AS rn
    FROM keyed
    WHERE PostKey <> '' AND LEN(PostKey) <= 200
)
UPDATE q SET SourcePostKey = r.PostKey
FROM JobDraftQueue q
JOIN ranked r ON r.Id = q.Id
WHERE r.rn = 1;");

            migrationBuilder.CreateIndex(
                name: "IX_JobDraftQueue_SourcePostKey",
                table: "JobDraftQueue",
                column: "SourcePostKey",
                unique: true,
                filter: "[SourcePostKey] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JobDraftQueue_SourcePostKey",
                table: "JobDraftQueue");

            migrationBuilder.DropColumn(
                name: "LastFetchSkippedPendingCount",
                table: "JobFeedSources");

            migrationBuilder.DropColumn(
                name: "LastFetchSkippedReviewedCount",
                table: "JobFeedSources");

            migrationBuilder.DropColumn(
                name: "SourcePostKey",
                table: "JobDraftQueue");
        }
    }
}
