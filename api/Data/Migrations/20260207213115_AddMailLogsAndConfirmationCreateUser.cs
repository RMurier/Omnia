using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailLogsAndConfirmationCreateUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EMAIL_CONFIRMATION_TOKEN",
                table: "T_USER",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EMAIL_CONFIRMED",
                table: "T_USER",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "T_MAIL_LOG",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FROM_ADDRESS = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TO_ADDRESSES = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "[]"),
                    CC_ADDRESSES = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BCC_ADDRESSES = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SUBJECT = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BODY = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ATTACHMENTS_JSON = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "[]"),
                    STATUS = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: false),
                    ERROR_MESSAGE = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FINGERPRINT = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    IS_PATCHED = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    SENT_AT_UTC = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_MAIL_LOG", x => x.ID);
                    table.ForeignKey(
                        name: "FK_T_MAIL_LOG_T_APPLICATION_REF_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "T_USER",
                keyColumn: "ID",
                keyValue: new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"),
                columns: new[] { "EMAIL_CONFIRMATION_TOKEN", "EMAIL_CONFIRMED" },
                values: new object[] { null, true });

            migrationBuilder.CreateIndex(
                name: "IX_T_MAIL_LOG_REF_APPLICATION",
                table: "T_MAIL_LOG",
                column: "REF_APPLICATION");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "T_MAIL_LOG");

            migrationBuilder.DropColumn(
                name: "EMAIL_CONFIRMATION_TOKEN",
                table: "T_USER");

            migrationBuilder.DropColumn(
                name: "EMAIL_CONFIRMED",
                table: "T_USER");
        }
    }
}
