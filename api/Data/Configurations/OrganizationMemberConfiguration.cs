using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations;

public class OrganizationMemberConfiguration : IEntityTypeConfiguration<OrganizationMember>
{
    public void Configure(EntityTypeBuilder<OrganizationMember> builder)
    {
        builder.ToTable("T_ORGANIZATION_MEMBER");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.RefOrganization)
            .HasColumnName("REF_ORGANIZATION")
            .IsRequired();

        builder.Property(x => x.RefUser)
            .HasColumnName("REF_USER")
            .IsRequired();

        builder.Property(x => x.RefRoleOrganization)
            .HasColumnName("REF_ROLE_ORGANIZATION")
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("CREATED_AT")
            .IsRequired();

        // Unique constraint: one user can only have one membership per organization
        builder.HasIndex(x => new { x.RefOrganization, x.RefUser })
            .IsUnique()
            .HasDatabaseName("UX_ORGANIZATION_MEMBER_ORG_USER");

        // FK to Organization
        builder.HasOne(x => x.Organization)
            .WithMany(o => o.Members)
            .HasForeignKey(x => x.RefOrganization)
            .HasConstraintName("FK_ORGANIZATION_MEMBER_ORGANIZATION")
            .OnDelete(DeleteBehavior.Cascade);

        // FK to User
        builder.HasOne(x => x.User)
            .WithMany(u => u.OrganizationMemberships)
            .HasForeignKey(x => x.RefUser)
            .HasConstraintName("FK_ORGANIZATION_MEMBER_USER")
            .OnDelete(DeleteBehavior.Cascade);

        // FK to RoleOrganization
        builder.HasOne(x => x.RoleOrganization)
            .WithMany(r => r.OrganizationMembers)
            .HasForeignKey(x => x.RefRoleOrganization)
            .HasConstraintName("FK_ORGANIZATION_MEMBER_ROLE")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
