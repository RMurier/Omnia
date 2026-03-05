using api.Data.Configurations;
using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class ApplicationEncryptionKeyConfiguration : IEntityTypeConfiguration<ApplicationEncryptionKey>
{
    public static readonly Guid OmniaEncryptionKeyId = new("a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d");

    public void Configure(EntityTypeBuilder<ApplicationEncryptionKey> builder)
    {
        builder.ToTable("T_APPLICATION_ENCRYPTION_KEY");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.RefApplication)
            .HasColumnName("REF_APPLICATION")
            .IsRequired();

        builder.Property(x => x.KeyEnc)
            .HasColumnName("KEY_ENC")
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("CREATED_AT")
            .IsRequired();

        builder.HasIndex(x => x.RefApplication)
            .IsUnique()
            .HasDatabaseName("UX_APPLICATION_ENCRYPTION_KEY_REF_APPLICATION");

        builder.HasOne(x => x.Application)
            .WithMany()
            .HasForeignKey(x => x.RefApplication)
            .HasConstraintName("FK_APPLICATION_ENCRYPTION_KEY_REF_APPLICATION")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(
            new ApplicationEncryptionKey
            {
                Id = OmniaEncryptionKeyId,
                RefApplication = ApplicationConfiguration.OmniaAppId,
                KeyEnc = "IQfYMxIc4RqfMOeZyj/1wtpyS/8EB0kMHkuKF4f40tXzEAXDCpaVLpCfuVHkXmtXQKl8TEa6VCTaZUOv",
                CreatedAt = new DateTime(2026, 01, 09, 17, 00, 00, DateTimeKind.Utc)
            });
    }
}
