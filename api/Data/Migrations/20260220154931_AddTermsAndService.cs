using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTermsAndService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TERMS_ACCEPTED_AT",
                table: "T_USER",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TERMS_VERSION",
                table: "T_USER",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                columns: new[] { "TERMS_ACCEPTED_AT", "TERMS_VERSION" },
                values: new object[] { null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TERMS_ACCEPTED_AT",
                table: "T_USER");

            migrationBuilder.DropColumn(
                name: "TERMS_VERSION",
                table: "T_USER");
        }
    }
}
