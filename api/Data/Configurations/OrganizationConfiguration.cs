using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.ToTable("T_ORGANIZATION");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.Name)
            .HasColumnName("NAME")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.RefOwner)
            .HasColumnName("REF_OWNER")
            .IsRequired();

        builder.Property(x => x.IsActive)
            .HasColumnName("IS_ACTIVE")
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(x => x.LastActiveAt)
            .HasColumnName("LAST_ACTIVE_AT")
            .IsRequired(false);

        builder.Property(x => x.CreatedAt)
            .HasColumnName("CREATED_AT")
            .IsRequired();

        // FK to Owner (User)
        builder.HasOne(x => x.Owner)
            .WithMany(u => u.OwnedOrganizations)
            .HasForeignKey(x => x.RefOwner)
            .HasConstraintName("FK_ORGANIZATION_OWNER")
            .OnDelete(DeleteBehavior.Restrict);

        // Applications are linked via Application.RefOrganization (configured there)
    }
}
