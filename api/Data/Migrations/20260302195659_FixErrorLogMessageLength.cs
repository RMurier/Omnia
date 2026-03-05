using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixErrorLogMessageLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_T_ORGANIZATION_MEMBER_REF_ROLE",
                table: "T_ORGANIZATION_MEMBER",
                newName: "IX_T_ORGANIZATION_MEMBER_REF_ROLE_ORGANIZATION");

            migrationBuilder.RenameIndex(
                name: "IX_T_ORGANIZATION_INVITATION_REF_ROLE",
                table: "T_ORGANIZATION_INVITATION",
                newName: "IX_T_ORGANIZATION_INVITATION_REF_ROLE_ORGANIZATION");

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "T_ERROR_LOG",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1024)",
                oldMaxLength: 1024);

            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                column: "TERMS_ACCEPTED_AT",
                value: new DateTime(2026, 3, 2, 19, 56, 58, 407, DateTimeKind.Utc).AddTicks(1652));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_T_ORGANIZATION_MEMBER_REF_ROLE_ORGANIZATION",
                table: "T_ORGANIZATION_MEMBER",
                newName: "IX_T_ORGANIZATION_MEMBER_REF_ROLE");

            migrationBuilder.RenameIndex(
                name: "IX_T_ORGANIZATION_INVITATION_REF_ROLE_ORGANIZATION",
                table: "T_ORGANIZATION_INVITATION",
                newName: "IX_T_ORGANIZATION_INVITATION_REF_ROLE");

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "T_ERROR_LOG",
                type: "nvarchar(1024)",
                maxLength: 1024,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                column: "TERMS_ACCEPTED_AT",
                value: new DateTime(2026, 2, 24, 22, 41, 41, 72, DateTimeKind.Utc).AddTicks(9681));
        }
    }
}
