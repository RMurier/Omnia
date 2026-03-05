using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class ApplicationSecretConfiguration : IEntityTypeConfiguration<ApplicationSecret>
{
    public void Configure(EntityTypeBuilder<ApplicationSecret> builder)
    {
        builder.ToTable("T_APPLICATION_SECRET");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.RefApplication)
            .HasColumnName("REF_APPLICATION")
            .IsRequired();

        builder.Property(x => x.Version)
            .HasColumnName("VERSION")
            .IsRequired();

        builder.Property(x => x.SecretEnc)
            .HasColumnName("SECRET_ENC")
            .IsRequired();

        builder.Property(x => x.IsActive)
            .HasColumnName("IS_ACTIVE")
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("CREATED_AT")
            .IsRequired();

        builder.HasIndex(x => new { x.RefApplication, x.Version })
            .IsUnique()
            .HasDatabaseName("UX_APPLICATION_SECRET_REF_APPLICATION_VERSION");

        builder.HasData(new ApplicationSecret()
        {
            Id = new Guid("A1335D03-915B-48BB-9705-66070D0CC361"),
            RefApplication = new Guid("6932A69E-EAA0-4E9C-B4CF-D7A9C6524E4C"),
            Version = 1,
            IsActive = true,
            SecretEnc = "OBQKQeJ4BzCOYgCVIZOcz0sRgvDcgVbdIf6kgOWG+I6uqYdJBYByOEf15wLZgr4X0TjtH+zVXARToacA8pWCu8q2U8l5THaa",
            CreatedAt = new DateTime(2026, 01, 10, 19, 00, 00)
        });

    }
}
