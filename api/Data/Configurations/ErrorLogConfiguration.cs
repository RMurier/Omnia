using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public class ErrorLogConfiguration : IEntityTypeConfiguration<ErrorLog>
    {
        public void Configure(EntityTypeBuilder<ErrorLog> builder)
        {
            builder.ToTable("T_ERROR_LOG");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("ID")
                .HasDefaultValueSql("NEWID()")
                .ValueGeneratedOnAdd();

            builder.Property(x => x.Message)
                .HasColumnName("MESSAGE")
                .IsRequired(true);

            builder.Property(x => x.StackTrace)
                .HasColumnName("STACK_TRACE")
                .IsRequired(false);

            builder.Property(x => x.ErrorDate)
                .HasColumnName("ERROR_DATE")
                .IsRequired();

            builder.Property(x => x.RefApplication)
                .HasColumnName("REF_APPLICATION")
                .IsRequired(true);

            builder.HasOne(x => x.Application)
                .WithMany()
                .OnDelete(DeleteBehavior.Cascade)
                .HasForeignKey(x => x.RefApplication);
        }
    }
}