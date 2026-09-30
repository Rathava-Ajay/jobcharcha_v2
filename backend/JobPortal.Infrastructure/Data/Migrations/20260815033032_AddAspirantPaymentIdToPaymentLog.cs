using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAspirantPaymentIdToPaymentLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AspirantPaymentId",
                table: "PaymentLogs",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentLogs_AspirantPaymentId",
                table: "PaymentLogs",
                column: "AspirantPaymentId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentLogs_AspirantPayments_AspirantPaymentId",
                table: "PaymentLogs",
                column: "AspirantPaymentId",
                principalTable: "AspirantPayments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentLogs_AspirantPayments_AspirantPaymentId",
                table: "PaymentLogs");

            migrationBuilder.DropIndex(
                name: "IX_PaymentLogs_AspirantPaymentId",
                table: "PaymentLogs");

            migrationBuilder.DropColumn(
                name: "AspirantPaymentId",
                table: "PaymentLogs");
        }
    }
}
