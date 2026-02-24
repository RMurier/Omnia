using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDefaultUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                columns: new[] { "TERMS_ACCEPTED_AT", "TERMS_VERSION" },
                values: new object[] { new DateTime(2026, 2, 24, 22, 41, 41, 72, DateTimeKind.Utc).AddTicks(9681), "1.0" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                columns: new[] { "TERMS_ACCEPTED_AT", "TERMS_VERSION" },
                values: new object[] { null, null });
        }
    }
}
