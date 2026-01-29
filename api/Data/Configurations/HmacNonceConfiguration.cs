using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class HmacNonceConfiguration : IEntityTypeConfiguration<HmacNonce>
{
    public void Configure(EntityTypeBuilder<HmacNonce> builder)
    {
        builder.ToTable("T_HMAC_NONCE");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");


        builder.Property(x => x.RefApplication)
            .HasColumnName("REF_APPLICATION")
            .IsRequired();

        builder.Property(x => x.Nonce)
            .HasColumnName("NONCE")
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(x => x.ExpiresAt)
            .HasColumnName("EXPIRES_AT")
            .IsRequired();

        builder.HasOne(x => x.Application)
            .WithMany()
            .HasForeignKey(x => x.RefApplication)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RefApplication, x.Nonce })
            .IsUnique()
            .HasDatabaseName("UX_HMAC_NONCE_REF_APPLICATION_NONCE");

        builder.HasIndex(x => x.ExpiresAt)
            .HasDatabaseName("IX_HMAC_NONCE_EXPIRES_AT");
    }
}
