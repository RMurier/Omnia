using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class ApplicationEncryptionKeyConfiguration : IEntityTypeConfiguration<ApplicationEncryptionKey>
{
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
    }
}
