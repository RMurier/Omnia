using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public class ConnectionLogConfiguration : IEntityTypeConfiguration<ConnectionLog>
    {
        public void Configure(EntityTypeBuilder<ConnectionLog> builder)
        {
            builder.ToTable("T_CONNECTION_LOG");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                    .HasColumnName("ID")
                    .HasDefaultValueSql("NEWID()")
                    .ValueGeneratedOnAdd();

            builder.Property(x => x.ComplementaryInformation)
                    .HasColumnName("COMPLEMENTARY_INFORMATION")
                   .IsRequired(false);

            builder.Property(x => x.ConnectionDate)
                   .HasColumnName("CONNECTION_DATE") 
                   .IsRequired();

            builder.Property(x => x.IsSuccess)
                    .HasColumnName("IS_SUCCESS")
                   .IsRequired(true);

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
