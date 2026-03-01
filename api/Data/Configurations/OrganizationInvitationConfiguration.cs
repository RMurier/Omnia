using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations;

public class OrganizationInvitationConfiguration : IEntityTypeConfiguration<OrganizationInvitation>
{
    public void Configure(EntityTypeBuilder<OrganizationInvitation> builder)
    {
        builder.ToTable("T_ORGANIZATION_INVITATION");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.RefOrganization)
            .HasColumnName("REF_ORGANIZATION")
            .IsRequired();

        builder.Property(x => x.Email)
            .HasColumnName("EMAIL")
            .IsRequired();

        builder.Property(x => x.RefRoleOrganization)
            .HasColumnName("REF_ROLE_ORGANIZATION")
            .IsRequired();

        builder.Property(x => x.InvitedBy)
            .HasColumnName("INVITED_BY")
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("CREATED_AT")
            .IsRequired();

        // Unique: one pending invitation per email per organization
        builder.HasIndex(x => new { x.RefOrganization, x.Email })
            .IsUnique()
            .HasDatabaseName("UX_ORGANIZATION_INVITATION_ORG_EMAIL");

        // FK to Organization
        builder.HasOne(x => x.Organization)
            .WithMany()
            .HasForeignKey(x => x.RefOrganization)
            .HasConstraintName("FK_ORGANIZATION_INVITATION_ORGANIZATION")
            .OnDelete(DeleteBehavior.Cascade);

        // FK to RoleOrganization
        builder.HasOne(x => x.RoleOrganization)
            .WithMany()
            .HasForeignKey(x => x.RefRoleOrganization)
            .HasConstraintName("FK_ORGANIZATION_INVITATION_ROLE")
            .OnDelete(DeleteBehavior.Restrict);

        // FK to User (inviter)
        builder.HasOne(x => x.InvitedByUser)
            .WithMany()
            .HasForeignKey(x => x.InvitedBy)
            .HasConstraintName("FK_ORGANIZATION_INVITATION_INVITEDBY")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
