using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentLogEventId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RazorpayEventId",
                table: "PaymentLogs",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentLogs_RazorpayEventId",
                table: "PaymentLogs",
                column: "RazorpayEventId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentLogs_RazorpayEventId",
                table: "PaymentLogs");

            migrationBuilder.DropColumn(
                name: "RazorpayEventId",
                table: "PaymentLogs");
        }
    }
}
