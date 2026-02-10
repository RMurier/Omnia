using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailSystemLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "T_SYSTEM_MAIL_LOG",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    FROM_ADDRESS = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TO_ADDRESSES = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CC_ADDRESSES = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BCC_ADDRESSES = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SUBJECT = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BODY = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    STATUS = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: false),
                    ERROR_MESSAGE = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FINGERPRINT = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    SENT_AT_UTC = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_SYSTEM_MAIL_LOG", x => x.ID);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "T_SYSTEM_MAIL_LOG");
        }
    }
}
