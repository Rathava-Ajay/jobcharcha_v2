using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentIdempotencyUniqueIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Orders_RazorpayPaymentId_Unique",
                table: "Orders",
                column: "RazorpayPaymentId",
                unique: true,
                filter: "([RazorpayPaymentId] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_AspirantPayments_RazorpayPaymentId_Unique",
                table: "AspirantPayments",
                column: "RazorpayPaymentId",
                unique: true,
                filter: "([RazorpayPaymentId] IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_RazorpayPaymentId_Unique",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_AspirantPayments_RazorpayPaymentId_Unique",
                table: "AspirantPayments");
        }
    }
}
