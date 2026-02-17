using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations
{
    public class ApplicationInvitationConfiguration : IEntityTypeConfiguration<ApplicationInvitation>
    {
        public void Configure(EntityTypeBuilder<ApplicationInvitation> builder)
        {
            builder.ToTable("T_APPLICATION_INVITATION");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("ID");

            builder.Property(x => x.RefApplication)
                .HasColumnName("REF_APPLICATION")
                .IsRequired();

            builder.Property(x => x.Email)
                .HasColumnName("EMAIL")
                .IsRequired();

            builder.Property(x => x.RefRoleApplication)
                .HasColumnName("REF_ROLE_APPLICATION")
                .IsRequired();

            builder.Property(x => x.InvitedBy)
                .HasColumnName("INVITED_BY")
                .IsRequired();

            builder.Property(x => x.CreatedAt)
                .HasColumnName("CREATED_AT")
                .IsRequired();

            // Unique: one pending invitation per email per application
            builder.HasIndex(x => new { x.RefApplication, x.Email })
                .IsUnique()
                .HasDatabaseName("UX_APPLICATION_INVITATION_APP_EMAIL");

            // FK to Application
            builder.HasOne(x => x.Application)
                .WithMany()
                .HasForeignKey(x => x.RefApplication)
                .HasConstraintName("FK_APPLICATION_INVITATION_APPLICATION")
                .OnDelete(DeleteBehavior.Cascade);

            // FK to RoleApplication
            builder.HasOne(x => x.RoleApplication)
                .WithMany()
                .HasForeignKey(x => x.RefRoleApplication)
                .HasConstraintName("FK_APPLICATION_INVITATION_ROLE")
                .OnDelete(DeleteBehavior.Restrict);

            // FK to User (inviter)
            builder.HasOne(x => x.InvitedByUser)
                .WithMany()
                .HasForeignKey(x => x.InvitedBy)
                .HasConstraintName("FK_APPLICATION_INVITATION_INVITEDBY")
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
