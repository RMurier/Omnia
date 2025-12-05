using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("T_USER");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("ID")
                .HasDefaultValueSql("NEWID()")
                .ValueGeneratedOnAdd();

            builder.Property(x => x.Username)
                .HasColumnName("USERNAME")
                .HasMaxLength(100)
                .IsRequired(true);

            builder.Property(x => x.Password)
                .HasColumnName("PASSWORD")
                .IsRequired(true);

            builder.Property(x => x.Salt)
                .HasColumnName("SALT")
                .IsRequired(true);

        }
    }
}