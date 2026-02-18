using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLogRetention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LOG_RETENTION_VALUE",
                table: "T_APPLICATION",
                type: "int",
                nullable: false,
                defaultValue: 7);

            migrationBuilder.AddColumn<string>(
                name: "LOG_RETENTION_UNIT",
                table: "T_APPLICATION",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "days");

            migrationBuilder.UpdateData(
                table: "T_APPLICATION",
                keyColumn: "ID",
                keyValue: new Guid("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c"),
                columns: new[] { "LOG_RETENTION_VALUE", "LOG_RETENTION_UNIT" },
                values: new object[] { 7, "days" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LOG_RETENTION_VALUE",
                table: "T_APPLICATION");

            migrationBuilder.DropColumn(
                name: "LOG_RETENTION_UNIT",
                table: "T_APPLICATION");
        }
    }
}
