using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddResetPassword : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PASSWORD_RESET_TOKEN",
                table: "T_USER",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PASSWORD_RESET_TOKEN_EXPIRES_AT",
                table: "T_USER",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "T_APPLICATION_INVITATION",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EMAIL = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    REF_ROLE_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    INVITED_BY = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_APPLICATION_INVITATION", x => x.ID);
                    table.ForeignKey(
                        name: "FK_APPLICATION_INVITATION_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_APPLICATION_INVITATION_INVITEDBY",
                        column: x => x.INVITED_BY,
                        principalTable: "T_USER",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_APPLICATION_INVITATION_ROLE",
                        column: x => x.REF_ROLE_APPLICATION,
                        principalTable: "T_ROLE_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                columns: new[] { "PASSWORD_RESET_TOKEN", "PASSWORD_RESET_TOKEN_EXPIRES_AT" },
                values: new object[] { null, null });

            migrationBuilder.CreateIndex(
                name: "IX_T_APPLICATION_INVITATION_INVITED_BY",
                table: "T_APPLICATION_INVITATION",
                column: "INVITED_BY");

            migrationBuilder.CreateIndex(
                name: "IX_T_APPLICATION_INVITATION_REF_ROLE_APPLICATION",
                table: "T_APPLICATION_INVITATION",
                column: "REF_ROLE_APPLICATION");

            migrationBuilder.CreateIndex(
                name: "UX_APPLICATION_INVITATION_APP_EMAIL",
                table: "T_APPLICATION_INVITATION",
                columns: new[] { "REF_APPLICATION", "EMAIL" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "T_APPLICATION_INVITATION");

            migrationBuilder.DropColumn(
                name: "PASSWORD_RESET_TOKEN",
                table: "T_USER");

            migrationBuilder.DropColumn(
                name: "PASSWORD_RESET_TOKEN_EXPIRES_AT",
                table: "T_USER");
        }
    }
}
