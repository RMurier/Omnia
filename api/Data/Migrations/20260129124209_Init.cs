using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "T_ROLE_APPLICATION",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NAME = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DESCRIPTION = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_ROLE_APPLICATION", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "T_USER",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    EMAIL = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NAME = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LAST_NAME = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PASSWORD = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SALT = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_USER", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "T_APPLICATION",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_OWNER = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DESCRIPTION = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IS_ACTIVE = table.Column<bool>(type: "bit", nullable: false),
                    NAME = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    URL = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_APPLICATION", x => x.ID);
                    table.ForeignKey(
                        name: "FK_APPLICATION_OWNER",
                        column: x => x.REF_OWNER,
                        principalTable: "T_USER",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "T_ACTIVITY",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ANONYMOUS_USER_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CONNECTED_AT_UTC = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_ACTIVITY", x => x.ID);
                    table.ForeignKey(
                        name: "FK_T_ACTIVITY_T_APPLICATION_REF_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "T_APPLICATION_ENCRYPTION_KEY",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    KEY_ENC = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_APPLICATION_ENCRYPTION_KEY", x => x.ID);
                    table.ForeignKey(
                        name: "FK_APPLICATION_ENCRYPTION_KEY_REF_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "T_APPLICATION_MEMBER",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_USER = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_ROLE_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_APPLICATION_MEMBER", x => x.ID);
                    table.ForeignKey(
                        name: "FK_APPLICATION_MEMBER_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_APPLICATION_MEMBER_ROLE",
                        column: x => x.REF_ROLE_APPLICATION,
                        principalTable: "T_ROLE_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_APPLICATION_MEMBER_USER",
                        column: x => x.REF_USER,
                        principalTable: "T_USER",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "T_APPLICATION_SECRET",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VERSION = table.Column<int>(type: "int", nullable: false),
                    SECRET_ENC = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IS_ACTIVE = table.Column<bool>(type: "bit", nullable: false),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_APPLICATION_SECRET", x => x.ID);
                    table.ForeignKey(
                        name: "FK_APPLICATION_SECRET_REF_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "T_ERROR_LOG",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CATEGORY = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true),
                    LEVEL = table.Column<string>(type: "varchar(16)", unicode: false, maxLength: 16, nullable: true),
                    Message = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    FINGERPRINT = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    PAYLOAD_JSON = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "{}"),
                    IS_PATCHED = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    OCCURED_AT_UTC = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_ERROR_LOG", x => x.ID);
                    table.ForeignKey(
                        name: "FK_T_ERROR_LOG_T_APPLICATION_REF_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "T_HMAC_NONCE",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_APPLICATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NONCE = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    EXPIRES_AT = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_HMAC_NONCE", x => x.ID);
                    table.ForeignKey(
                        name: "FK_T_HMAC_NONCE_T_APPLICATION_REF_APPLICATION",
                        column: x => x.REF_APPLICATION,
                        principalTable: "T_APPLICATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "T_ROLE_APPLICATION",
                columns: new[] { "ID", "DESCRIPTION", "NAME" },
                values: new object[,]
                {
                    { new Guid("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"), "Full access. Can manage members and delete the application.", "Owner" },
                    { new Guid("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"), "Can edit the application and manage logs/activities.", "Maintainer" },
                    { new Guid("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f"), "Read-only access to the application, logs and activities.", "Viewer" }
                });

            migrationBuilder.InsertData(
                table: "T_USER",
                columns: new[] { "ID", "EMAIL", "LAST_NAME", "NAME", "PASSWORD", "SALT" },
                values: new object[] { new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"), "MGxkV2lfdkupgorWnMHpeyIT9IX5GIDcQctl6JHkwo0=", "7mKmhERhwYiFtwf2l6BJMQ==", "c8Tpx9kHQj0Xio6wAidnkg==", "wWwFqHINsN9P0TzRMd1d5yJQ9pz1nvw5ck0uRuVJu/D2kPPH/U/HylErGpB9g5RXA4mS8FqnAgdhXSuOgpabNQ==", "vhLKoFuOfVK46NC4W056EkXEEsYAQogvnd/kOg4HU80=" });

            migrationBuilder.InsertData(
                table: "T_APPLICATION",
                columns: new[] { "ID", "CREATED_AT", "DESCRIPTION", "IS_ACTIVE", "NAME", "REF_OWNER", "URL" },
                values: new object[] { new Guid("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c"), new DateTime(2026, 1, 9, 17, 0, 0, 0, DateTimeKind.Unspecified), "Application centrale", true, "Omnia", new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21"), null });

            migrationBuilder.InsertData(
                table: "T_APPLICATION_ENCRYPTION_KEY",
                columns: new[] { "ID", "CREATED_AT", "KEY_ENC", "REF_APPLICATION" },
                values: new object[] { new Guid("a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"), new DateTime(2026, 1, 9, 17, 0, 0, 0, DateTimeKind.Utc), "IQfYMxIc4RqfMOeZyj/1wtpyS/8EB0kMHkuKF4f40tXzEAXDCpaVLpCfuVHkXmtXQKl8TEa6VCTaZUOv", new Guid("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c") });

            migrationBuilder.InsertData(
                table: "T_APPLICATION_MEMBER",
                columns: new[] { "ID", "CREATED_AT", "REF_APPLICATION", "REF_ROLE_APPLICATION", "REF_USER" },
                values: new object[] { new Guid("e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b"), new DateTime(2026, 1, 9, 17, 0, 0, 0, DateTimeKind.Unspecified), new Guid("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c"), new Guid("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"), new Guid("1c7850fa-2cf8-4716-9991-b26d4f169d21") });

            migrationBuilder.InsertData(
                table: "T_APPLICATION_SECRET",
                columns: new[] { "ID", "CREATED_AT", "IS_ACTIVE", "REF_APPLICATION", "SECRET_ENC", "VERSION" },
                values: new object[] { new Guid("a1335d03-915b-48bb-9705-66070d0cc361"), new DateTime(2026, 1, 10, 19, 0, 0, 0, DateTimeKind.Unspecified), true, new Guid("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c"), "CfDJ8ApD0cbs3XhCviRx30E9Yehc-ljT-BV7IqeJrOqH-RMOzRbjJIVFzUjwlPBco3x7SN0XbRUYKPnRHNALG-iTWGke2lKD45HQ5VPjbgjugC9WOIfLhg0C7G4yN3JHpKojtt0w2LOo4ge8TaXJIVurrhWhzyXUqSu33DnC9Zf-LtIr", 1 });

            migrationBuilder.CreateIndex(
                name: "IX_T_ACTIVITY_REF_APPLICATION",
                table: "T_ACTIVITY",
                column: "REF_APPLICATION");

            migrationBuilder.CreateIndex(
                name: "IX_T_APPLICATION_REF_OWNER",
                table: "T_APPLICATION",
                column: "REF_OWNER");

            migrationBuilder.CreateIndex(
                name: "UX_APPLICATION_ENCRYPTION_KEY_REF_APPLICATION",
                table: "T_APPLICATION_ENCRYPTION_KEY",
                column: "REF_APPLICATION",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_T_APPLICATION_MEMBER_REF_ROLE_APPLICATION",
                table: "T_APPLICATION_MEMBER",
                column: "REF_ROLE_APPLICATION");

            migrationBuilder.CreateIndex(
                name: "IX_T_APPLICATION_MEMBER_REF_USER",
                table: "T_APPLICATION_MEMBER",
                column: "REF_USER");

            migrationBuilder.CreateIndex(
                name: "UX_APPLICATION_MEMBER_APP_USER",
                table: "T_APPLICATION_MEMBER",
                columns: new[] { "REF_APPLICATION", "REF_USER" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_APPLICATION_SECRET_REF_APPLICATION_VERSION",
                table: "T_APPLICATION_SECRET",
                columns: new[] { "REF_APPLICATION", "VERSION" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_T_ERROR_LOG_REF_APPLICATION",
                table: "T_ERROR_LOG",
                column: "REF_APPLICATION");

            migrationBuilder.CreateIndex(
                name: "IX_HMAC_NONCE_EXPIRES_AT",
                table: "T_HMAC_NONCE",
                column: "EXPIRES_AT");

            migrationBuilder.CreateIndex(
                name: "UX_HMAC_NONCE_REF_APPLICATION_NONCE",
                table: "T_HMAC_NONCE",
                columns: new[] { "REF_APPLICATION", "NONCE" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_ROLE_APPLICATION_NAME",
                table: "T_ROLE_APPLICATION",
                column: "NAME",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_USER_EMAIL",
                table: "T_USER",
                column: "EMAIL",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "T_ACTIVITY");

            migrationBuilder.DropTable(
                name: "T_APPLICATION_ENCRYPTION_KEY");

            migrationBuilder.DropTable(
                name: "T_APPLICATION_MEMBER");

            migrationBuilder.DropTable(
                name: "T_APPLICATION_SECRET");

            migrationBuilder.DropTable(
                name: "T_ERROR_LOG");

            migrationBuilder.DropTable(
                name: "T_HMAC_NONCE");

            migrationBuilder.DropTable(
                name: "T_ROLE_APPLICATION");

            migrationBuilder.DropTable(
                name: "T_APPLICATION");

            migrationBuilder.DropTable(
                name: "T_USER");
        }
    }
}
