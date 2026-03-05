using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations;

public class RoleOrganizationConfiguration : IEntityTypeConfiguration<RoleOrganization>
{
    public void Configure(EntityTypeBuilder<RoleOrganization> builder)
    {
        builder.ToTable("T_ROLE_ORGANIZATION");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.Name)
            .HasColumnName("NAME")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Description)
            .HasColumnName("DESCRIPTION")
            .HasMaxLength(255);

        builder.HasIndex(x => x.Name)
            .IsUnique()
            .HasDatabaseName("UX_ROLE_ORGANIZATION_NAME");

        builder.HasData(RoleOrganization.All);
    }
}
