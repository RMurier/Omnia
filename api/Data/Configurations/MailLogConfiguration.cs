using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public sealed class MailLogConfiguration : IEntityTypeConfiguration<MailLog>
    {
        public void Configure(EntityTypeBuilder<MailLog> b)
        {
            b.ToTable("T_MAIL_LOG");

            b.HasKey(x => x.Id);

            b.Property(x => x.Id)
                .HasDefaultValueSql("NEWID()")
                .HasColumnName("ID")
                .ValueGeneratedNever();

            b.Property(x => x.RefApplication)
                .HasColumnName("REF_APPLICATION")
                .IsRequired();

            b.Property(x => x.FromAddress)
                .IsRequired()
                .HasColumnType("nvarchar(max)")
                .HasColumnName("FROM_ADDRESS");

            b.Property(x => x.ToAddresses)
                .IsRequired()
                .HasColumnType("nvarchar(max)")
                .HasColumnName("TO_ADDRESSES")
                .HasDefaultValue("[]");

            b.Property(x => x.CcAddresses)
                .HasColumnType("nvarchar(max)")
                .HasColumnName("CC_ADDRESSES");

            b.Property(x => x.BccAddresses)
                .HasColumnType("nvarchar(max)")
                .HasColumnName("BCC_ADDRESSES");

            b.Property(x => x.Subject)
                .IsRequired()
                .HasColumnType("nvarchar(max)")
                .HasColumnName("SUBJECT");

            b.Property(x => x.Body)
                .IsRequired()
                .HasColumnType("nvarchar(max)")
                .HasColumnName("BODY");

            b.Property(x => x.AttachmentsJson)
                .IsRequired()
                .HasColumnType("nvarchar(max)")
                .HasColumnName("ATTACHMENTS_JSON")
                .HasDefaultValue("[]");

            b.Property(x => x.Status)
                .IsRequired()
                .HasMaxLength(16)
                .HasColumnName("STATUS")
                .IsUnicode(false);

            b.Property(x => x.ErrorMessage)
                .HasColumnType("nvarchar(max)")
                .HasColumnName("ERROR_MESSAGE");

            b.Property(x => x.Fingerprint)
                .IsRequired()
                .HasMaxLength(64)
                .HasColumnName("FINGERPRINT")
                .IsUnicode(false);

            b.Property(x => x.IsPatched)
                .IsRequired()
                .HasColumnName("IS_PATCHED")
                .HasDefaultValue(false);

            b.Property(x => x.SentAtUtc)
                .HasColumnName("SENT_AT_UTC")
                .IsRequired();

            b.HasOne(x => x.Application)
                .WithMany()
                .HasForeignKey(x => x.RefApplication)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
