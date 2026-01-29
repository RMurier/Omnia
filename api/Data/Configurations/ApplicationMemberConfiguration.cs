using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations;

public class ApplicationMemberConfiguration : IEntityTypeConfiguration<ApplicationMember>
{
    public void Configure(EntityTypeBuilder<ApplicationMember> builder)
    {
        builder.ToTable("T_APPLICATION_MEMBER");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.RefApplication)
            .HasColumnName("REF_APPLICATION")
            .IsRequired();

        builder.Property(x => x.RefUser)
            .HasColumnName("REF_USER")
            .IsRequired();

        builder.Property(x => x.RefRoleApplication)
            .HasColumnName("REF_ROLE_APPLICATION")
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("CREATED_AT")
            .IsRequired();

        // Unique constraint: one user can only have one membership per application
        builder.HasIndex(x => new { x.RefApplication, x.RefUser })
            .IsUnique()
            .HasDatabaseName("UX_APPLICATION_MEMBER_APP_USER");

        // FK to Application
        builder.HasOne(x => x.Application)
            .WithMany(a => a.Members)
            .HasForeignKey(x => x.RefApplication)
            .HasConstraintName("FK_APPLICATION_MEMBER_APPLICATION")
            .OnDelete(DeleteBehavior.Cascade);

        // FK to User
        builder.HasOne(x => x.User)
            .WithMany(u => u.ApplicationMemberships)
            .HasForeignKey(x => x.RefUser)
            .HasConstraintName("FK_APPLICATION_MEMBER_USER")
            .OnDelete(DeleteBehavior.Cascade);

        // FK to RoleApplication
        builder.HasOne(x => x.RoleApplication)
            .WithMany(r => r.ApplicationMembers)
            .HasForeignKey(x => x.RefRoleApplication)
            .HasConstraintName("FK_APPLICATION_MEMBER_ROLE")
            .OnDelete(DeleteBehavior.Restrict);

        // Seed data: Default admin user is Owner of Omnia app
        builder.HasData(
            new ApplicationMember()
            {
                Id = new Guid("e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b"),
                RefApplication = ApplicationConfiguration.OmniaAppId,
                RefUser = UserConfiguration.DefaultAdminUserId,
                RefRoleApplication = RoleApplication.Ids.Owner,
                CreatedAt = new DateTime(2026, 01, 09, 17, 00, 00)
            });
    }
}
