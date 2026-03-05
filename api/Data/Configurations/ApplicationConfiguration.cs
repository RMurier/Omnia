using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public class ApplicationConfiguration : IEntityTypeConfiguration<Application>
    {
        // Well-known Omnia application ID
        public static readonly Guid OmniaAppId = new("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c");

        public void Configure(EntityTypeBuilder<Application> builder)
        {
            builder.ToTable("T_APPLICATION");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("ID");

            builder.Property(x => x.RefOwner)
                .HasColumnName("REF_OWNER")
                .IsRequired();

            builder.Property(x => x.Description)
                .HasColumnName("DESCRIPTION")
                .HasMaxLength(500);

            builder.Property(x => x.IsActive)
                .HasColumnName("IS_ACTIVE")
                .IsRequired();

            builder.Property(x => x.Name)
                .HasColumnName("NAME")
                .HasMaxLength(100);

            builder.Property(x => x.Url)
                .HasColumnName("URL")
                .HasMaxLength(2048);

            builder.Property(x => x.CreatedAt)
                .HasColumnName("CREATED_AT")
                .IsRequired();

            builder.Property(x => x.LogRetentionValue)
                .HasColumnName("LOG_RETENTION_VALUE")
                .IsRequired()
                .HasDefaultValue(7);

            builder.Property(x => x.LogRetentionUnit)
                .HasColumnName("LOG_RETENTION_UNIT")
                .HasMaxLength(10)
                .IsRequired()
                .HasDefaultValue("days");

            builder.Property(x => x.RefOrganization)
                .HasColumnName("REF_ORGANIZATION")
                .IsRequired(false);

            // FK to Organization
            builder.HasOne(x => x.Organization)
                .WithMany(o => o.Applications)
                .HasForeignKey(x => x.RefOrganization)
                .HasConstraintName("FK_APPLICATION_ORGANIZATION")
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);

            // FK to Owner (User)
            builder.HasOne(x => x.Owner)
                .WithMany(u => u.OwnedApplications)
                .HasForeignKey(x => x.RefOwner)
                .HasConstraintName("FK_APPLICATION_OWNER")
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(x => x.Secrets)
                   .WithOne(x => x.Application)
                   .HasForeignKey(x => x.RefApplication)
                   .HasConstraintName("FK_APPLICATION_SECRET_REF_APPLICATION")
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasData(
                new Application()
                {
                    Id = OmniaAppId,
                    RefOwner = UserConfiguration.DefaultAdminUserId,
                    Description = "Application centrale",
                    IsActive = true,
                    Name = "Omnia",
                    CreatedAt = new DateTime(2026, 01, 09, 17, 00, 00),
                    LogRetentionValue = 7,
                    LogRetentionUnit = "days"
                });
        }
    }
}
