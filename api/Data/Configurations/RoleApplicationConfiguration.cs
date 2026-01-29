using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations;

public class RoleApplicationConfiguration : IEntityTypeConfiguration<RoleApplication>
{
    public void Configure(EntityTypeBuilder<RoleApplication> builder)
    {
        builder.ToTable("T_ROLE_APPLICATION");

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
            .HasDatabaseName("UX_ROLE_APPLICATION_NAME");

        // Seed data
        builder.HasData(RoleApplication.All);
    }
}
