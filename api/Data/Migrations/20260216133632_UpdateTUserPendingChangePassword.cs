using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTUserPendingChangePassword : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PASSWORD_CHANGED_AT",
                table: "T_USER",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PASSWORD_CHANGE_TOKEN",
                table: "T_USER",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PASSWORD_CHANGE_TOKEN_EXPIRES_AT",
                table: "T_USER",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PENDING_PASSWORD",
                table: "T_USER",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PENDING_SALT",
                table: "T_USER",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                columns: new[] { "PASSWORD_CHANGE_TOKEN", "PASSWORD_CHANGE_TOKEN_EXPIRES_AT", "PASSWORD_CHANGED_AT", "PENDING_PASSWORD", "PENDING_SALT" },
                values: new object[] { null, null, null, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PASSWORD_CHANGED_AT",
                table: "T_USER");

            migrationBuilder.DropColumn(
                name: "PASSWORD_CHANGE_TOKEN",
                table: "T_USER");

            migrationBuilder.DropColumn(
                name: "PASSWORD_CHANGE_TOKEN_EXPIRES_AT",
                table: "T_USER");

            migrationBuilder.DropColumn(
                name: "PENDING_PASSWORD",
                table: "T_USER");

            migrationBuilder.DropColumn(
                name: "PENDING_SALT",
                table: "T_USER");
        }
    }
}
