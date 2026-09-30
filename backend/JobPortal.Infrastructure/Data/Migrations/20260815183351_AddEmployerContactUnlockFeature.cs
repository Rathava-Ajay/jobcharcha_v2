using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobPortal.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployerContactUnlockFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "Notified1DayAt",
                table: "EmployerSubscriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Notified7DayAt",
                table: "EmployerSubscriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlanId",
                table: "EmployerSubscriptions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "EmployerSubscriptions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CreditTransactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerProfileId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    BalanceAfter = table.Column<int>(type: "int", nullable: false),
                    ReferenceId = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditTransactions_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CreditTransactions_EmployerProfiles_EmployerProfileId",
                        column: x => x.EmployerProfileId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EmployerAcknowledgments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerProfileId = table.Column<int>(type: "int", nullable: false),
                    PlanVersion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployerAcknowledgments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployerAcknowledgments_EmployerProfiles_EmployerProfileId",
                        column: x => x.EmployerProfileId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EmployerContactLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerProfileId = table.Column<int>(type: "int", nullable: false),
                    CandidateUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreditDeducted = table.Column<bool>(type: "bit", nullable: false),
                    CreditsBefore = table.Column<int>(type: "int", nullable: false),
                    CreditsAfter = table.Column<int>(type: "int", nullable: false),
                    InitialMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployerContactLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployerContactLogs_AspNetUsers_CandidateUserId",
                        column: x => x.CandidateUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EmployerContactLogs_EmployerProfiles_EmployerProfileId",
                        column: x => x.EmployerProfileId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EmployerCredits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerProfileId = table.Column<int>(type: "int", nullable: false),
                    TotalCredits = table.Column<int>(type: "int", nullable: false),
                    UsedCredits = table.Column<int>(type: "int", nullable: false),
                    IsUnlimited = table.Column<bool>(type: "bit", nullable: false),
                    LowCreditNotifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployerCredits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployerCredits_EmployerProfiles_EmployerProfileId",
                        column: x => x.EmployerProfileId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EmployerPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Price = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    DurationDays = table.Column<int>(type: "int", nullable: false),
                    IsTopUp = table.Column<bool>(type: "bit", nullable: false),
                    IncludedCredits = table.Column<int>(type: "int", nullable: false),
                    IsUnlimitedCredits = table.Column<bool>(type: "bit", nullable: false),
                    MaxActiveJobs = table.Column<int>(type: "int", nullable: false),
                    MaxFeaturedJobs = table.Column<int>(type: "int", nullable: false),
                    CanAccessResumes = table.Column<bool>(type: "bit", nullable: false),
                    ResumeViewsPerMonth = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployerPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmployerPayments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployerProfileId = table.Column<int>(type: "int", nullable: false),
                    EmployerPlanId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RazorpayOrderId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RazorpayPaymentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RazorpaySignature = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployerPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployerPayments_EmployerPlans_EmployerPlanId",
                        column: x => x.EmployerPlanId,
                        principalTable: "EmployerPlans",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EmployerPayments_EmployerProfiles_EmployerProfileId",
                        column: x => x.EmployerProfileId,
                        principalTable: "EmployerProfiles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployerSubscriptions_PlanId",
                table: "EmployerSubscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditTransactions_CreatedByUserId",
                table: "CreditTransactions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditTransactions_EmployerProfileId",
                table: "CreditTransactions",
                column: "EmployerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerAcknowledgments_EmployerProfileId",
                table: "EmployerAcknowledgments",
                column: "EmployerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerContactLogs_CandidateUserId",
                table: "EmployerContactLogs",
                column: "CandidateUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerContactLogs_EmployerProfileId_CandidateUserId",
                table: "EmployerContactLogs",
                columns: new[] { "EmployerProfileId", "CandidateUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_EmployerCredits_EmployerProfileId",
                table: "EmployerCredits",
                column: "EmployerProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployerPayments_EmployerPlanId",
                table: "EmployerPayments",
                column: "EmployerPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerPayments_EmployerProfileId",
                table: "EmployerPayments",
                column: "EmployerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerPayments_RazorpayOrderId",
                table: "EmployerPayments",
                column: "RazorpayOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerPlans_IsActive",
                table: "EmployerPlans",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerPlans_IsTopUp",
                table: "EmployerPlans",
                column: "IsTopUp");

            migrationBuilder.AddForeignKey(
                name: "FK_EmployerSubscriptions_EmployerPlans_PlanId",
                table: "EmployerSubscriptions",
                column: "PlanId",
                principalTable: "EmployerPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EmployerSubscriptions_EmployerPlans_PlanId",
                table: "EmployerSubscriptions");

            migrationBuilder.DropTable(
                name: "CreditTransactions");

            migrationBuilder.DropTable(
                name: "EmployerAcknowledgments");

            migrationBuilder.DropTable(
                name: "EmployerContactLogs");

            migrationBuilder.DropTable(
                name: "EmployerCredits");

            migrationBuilder.DropTable(
                name: "EmployerPayments");

            migrationBuilder.DropTable(
                name: "EmployerPlans");

            migrationBuilder.DropIndex(
                name: "IX_EmployerSubscriptions_PlanId",
                table: "EmployerSubscriptions");

            migrationBuilder.DropColumn(
                name: "Notified1DayAt",
                table: "EmployerSubscriptions");

            migrationBuilder.DropColumn(
                name: "Notified7DayAt",
                table: "EmployerSubscriptions");

            migrationBuilder.DropColumn(
                name: "PlanId",
                table: "EmployerSubscriptions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "EmployerSubscriptions");
        }
    }
}
