using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        // Default admin user ID for seed data
        public static readonly Guid DefaultAdminUserId = new("1C7850FA-2CF8-4716-9991-B26D4F169D21");

        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("T_USER");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("ID")
                .HasDefaultValueSql("NEWID()")
                .ValueGeneratedOnAdd();

            builder.Property(x => x.Password)
                .HasColumnName("PASSWORD")
                .IsRequired(true);

            builder.Property(x => x.Salt)
                .HasColumnName("SALT")
                .IsRequired(true);

            builder.Property(x => x.Email)
                .HasColumnName("EMAIL")
                .IsRequired(true);

            builder.Property(x => x.Name)
                .HasColumnName("NAME")
                .IsRequired(false);

            builder.Property(x => x.LastName)
                .HasColumnName("LAST_NAME")
                .IsRequired(false);

            builder.Property(x => x.EmailConfirmed)
                .HasColumnName("EMAIL_CONFIRMED")
                .IsRequired(true)
                .HasDefaultValue(false);

            builder.Property(x => x.EmailConfirmationToken)
                .HasColumnName("EMAIL_CONFIRMATION_TOKEN")
                .HasMaxLength(128)
                .IsRequired(false);

            builder.Property(x => x.PasswordResetToken)
                .HasColumnName("PASSWORD_RESET_TOKEN")
                .HasMaxLength(128)
                .IsRequired(false);

            builder.Property(x => x.PasswordResetTokenExpiresAt)
                .HasColumnName("PASSWORD_RESET_TOKEN_EXPIRES_AT")
                .IsRequired(false);

            builder.HasIndex(x => x.Email)
                .IsUnique()
                .HasDatabaseName("UX_USER_EMAIL");

            // Seed default admin user (owner of Omnia app)
            builder.HasData(
                new User()
                {
                    Id = DefaultAdminUserId,
                    Email = "MGxkV2lfdkupgorWnMHpeyIT9IX5GIDcQctl6JHkwo0=",
                    Name = "c8Tpx9kHQj0Xio6wAidnkg==",
                    LastName = "7mKmhERhwYiFtwf2l6BJMQ==",
                    Password = "wWwFqHINsN9P0TzRMd1d5yJQ9pz1nvw5ck0uRuVJu/D2kPPH/U/HylErGpB9g5RXA4mS8FqnAgdhXSuOgpabNQ==",
                    Salt = "vhLKoFuOfVK46NC4W056EkXEEsYAQogvnd/kOg4HU80=",
                    EmailConfirmed = true
                });
        }
    }
}