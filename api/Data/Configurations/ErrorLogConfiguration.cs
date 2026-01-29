using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public sealed class ErrorLogConfiguration : IEntityTypeConfiguration<ErrorLog>
    {
        public void Configure(EntityTypeBuilder<ErrorLog> b)
        {
            b.ToTable("T_ERROR_LOG");

            b.HasKey(x => x.Id);

            b.Property(x => x.Id)
                .HasDefaultValueSql("NEWID()")
                .HasColumnName("ID")
                .ValueGeneratedNever();

            b.Property(x => x.RefApplication)
                .HasColumnName("REF_APPLICATION")
                .IsRequired();

            b.Property(x => x.Category)
                .HasMaxLength(64)
                .HasColumnName("CATEGORY")
                .IsUnicode(false);

            b.Property(x => x.Level)
                .HasMaxLength(16)
                .HasColumnName("LEVEL")
                .IsUnicode(false);

            b.Property(x => x.Message)
                .HasColumnName("Message")
                .IsRequired()
                .HasMaxLength(1024);

            b.Property(x => x.Fingerprint)
                .IsRequired()
                .HasMaxLength(64)
                .HasColumnName("FINGERPRINT")
                .IsUnicode(false);

            b.Property(x => x.PayloadJson)
                .IsRequired()
                .HasColumnType("nvarchar(max)")
                .HasColumnName("PAYLOAD_JSON")
                .HasDefaultValue("{}");

            b.Property(x => x.IsPatched)
                .IsRequired()
                .HasColumnName("IS_PATCHED")
                .HasDefaultValue(false);

            b.Property(x => x.OccurredAtUtc)
                .HasColumnName("OCCURED_AT_UTC")
                .IsRequired();

            b.HasOne(x => x.Application)
                .WithMany()
                .HasForeignKey(x => x.RefApplication)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
