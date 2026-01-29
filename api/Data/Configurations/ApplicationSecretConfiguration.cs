using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class ApplicationSecretConfiguration : IEntityTypeConfiguration<ApplicationSecret>
{
    public void Configure(EntityTypeBuilder<ApplicationSecret> builder)
    {
        builder.ToTable("T_APPLICATION_SECRET");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.RefApplication)
            .HasColumnName("REF_APPLICATION")
            .IsRequired();

        builder.Property(x => x.Version)
            .HasColumnName("VERSION")
            .IsRequired();

        builder.Property(x => x.SecretEnc)
            .HasColumnName("SECRET_ENC")
            .IsRequired();

        builder.Property(x => x.IsActive)
            .HasColumnName("IS_ACTIVE")
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("CREATED_AT")
            .IsRequired();

        builder.HasIndex(x => new { x.RefApplication, x.Version })
            .IsUnique()
            .HasDatabaseName("UX_APPLICATION_SECRET_REF_APPLICATION_VERSION");

        builder.HasData(new ApplicationSecret()
        {
            Id = new Guid("A1335D03-915B-48BB-9705-66070D0CC361"),
            RefApplication = new Guid("6932A69E-EAA0-4E9C-B4CF-D7A9C6524E4C"),
            Version = 1,
            IsActive = true,
            SecretEnc = "CfDJ8ApD0cbs3XhCviRx30E9Yehc-ljT-BV7IqeJrOqH-RMOzRbjJIVFzUjwlPBco3x7SN0XbRUYKPnRHNALG-iTWGke2lKD45HQ5VPjbgjugC9WOIfLhg0C7G4yN3JHpKojtt0w2LOo4ge8TaXJIVurrhWhzyXUqSu33DnC9Zf-LtIr",
            CreatedAt = new DateTime(2026, 01, 10, 19, 00, 00)
        });

    }
}
