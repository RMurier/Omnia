using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "T_ROLE_ORGANIZATION",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NAME = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DESCRIPTION = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_ROLE_ORGANIZATION", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "T_ORGANIZATION",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NAME = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    REF_OWNER = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IS_ACTIVE = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    LAST_ACTIVE_AT = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_ORGANIZATION", x => x.ID);
                    table.ForeignKey(
                        name: "FK_ORGANIZATION_OWNER",
                        column: x => x.REF_OWNER,
                        principalTable: "T_USER",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "T_ORGANIZATION_MEMBER",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_ORGANIZATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_USER = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_ROLE_ORGANIZATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_ORGANIZATION_MEMBER", x => x.ID);
                    table.ForeignKey(
                        name: "FK_ORGANIZATION_MEMBER_ORGANIZATION",
                        column: x => x.REF_ORGANIZATION,
                        principalTable: "T_ORGANIZATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ORGANIZATION_MEMBER_USER",
                        column: x => x.REF_USER,
                        principalTable: "T_USER",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ORGANIZATION_MEMBER_ROLE",
                        column: x => x.REF_ROLE_ORGANIZATION,
                        principalTable: "T_ROLE_ORGANIZATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "T_ORGANIZATION_INVITATION",
                columns: table => new
                {
                    ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_ORGANIZATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EMAIL = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    REF_ROLE_ORGANIZATION = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    INVITED_BY = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CREATED_AT = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_T_ORGANIZATION_INVITATION", x => x.ID);
                    table.ForeignKey(
                        name: "FK_ORGANIZATION_INVITATION_ORGANIZATION",
                        column: x => x.REF_ORGANIZATION,
                        principalTable: "T_ORGANIZATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ORGANIZATION_INVITATION_ROLE",
                        column: x => x.REF_ROLE_ORGANIZATION,
                        principalTable: "T_ROLE_ORGANIZATION",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ORGANIZATION_INVITATION_INVITEDBY",
                        column: x => x.INVITED_BY,
                        principalTable: "T_USER",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddColumn<Guid>(
                name: "REF_ORGANIZATION",
                table: "T_APPLICATION",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.InsertData(
                table: "T_ROLE_ORGANIZATION",
                columns: new[] { "ID", "NAME", "DESCRIPTION" },
                values: new object[,]
                {
                    { new Guid("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a"), "Owner", "Full access. Can manage members, apps and delete the organization." },
                    { new Guid("e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b"), "Maintainer", "Can create and manage apps. Cannot manage organization members." },
                    { new Guid("f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c"), "Viewer", "Read-only access to all organization apps, logs and activities." }
                });

            migrationBuilder.CreateIndex(
                name: "UX_ROLE_ORGANIZATION_NAME",
                table: "T_ROLE_ORGANIZATION",
                column: "NAME",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_T_ORGANIZATION_REF_OWNER",
                table: "T_ORGANIZATION",
                column: "REF_OWNER");

            migrationBuilder.CreateIndex(
                name: "UX_ORGANIZATION_MEMBER_ORG_USER",
                table: "T_ORGANIZATION_MEMBER",
                columns: new[] { "REF_ORGANIZATION", "REF_USER" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_T_ORGANIZATION_MEMBER_REF_USER",
                table: "T_ORGANIZATION_MEMBER",
                column: "REF_USER");

            migrationBuilder.CreateIndex(
                name: "IX_T_ORGANIZATION_MEMBER_REF_ROLE",
                table: "T_ORGANIZATION_MEMBER",
                column: "REF_ROLE_ORGANIZATION");

            migrationBuilder.CreateIndex(
                name: "UX_ORGANIZATION_INVITATION_ORG_EMAIL",
                table: "T_ORGANIZATION_INVITATION",
                columns: new[] { "REF_ORGANIZATION", "EMAIL" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_T_ORGANIZATION_INVITATION_REF_ROLE",
                table: "T_ORGANIZATION_INVITATION",
                column: "REF_ROLE_ORGANIZATION");

            migrationBuilder.CreateIndex(
                name: "IX_T_ORGANIZATION_INVITATION_INVITED_BY",
                table: "T_ORGANIZATION_INVITATION",
                column: "INVITED_BY");

            migrationBuilder.CreateIndex(
                name: "IX_T_APPLICATION_REF_ORGANIZATION",
                table: "T_APPLICATION",
                column: "REF_ORGANIZATION");

            migrationBuilder.AddForeignKey(
                name: "FK_APPLICATION_ORGANIZATION",
                table: "T_APPLICATION",
                column: "REF_ORGANIZATION",
                principalTable: "T_ORGANIZATION",
                principalColumn: "ID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_APPLICATION_ORGANIZATION",
                table: "T_APPLICATION");

            migrationBuilder.DropIndex(
                name: "IX_T_APPLICATION_REF_ORGANIZATION",
                table: "T_APPLICATION");

            migrationBuilder.DropColumn(
                name: "REF_ORGANIZATION",
                table: "T_APPLICATION");

            migrationBuilder.DropTable(name: "T_ORGANIZATION_INVITATION");
            migrationBuilder.DropTable(name: "T_ORGANIZATION_MEMBER");
            migrationBuilder.DropTable(name: "T_ORGANIZATION");
            migrationBuilder.DropTable(name: "T_ROLE_ORGANIZATION");
        }
    }
}
