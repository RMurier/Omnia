using api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Data.Configurations;

public sealed class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.ToTable("T_ACTIVITY");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID");

        builder.Property(x => x.RefApplication)
            .HasColumnName("REF_APPLICATION")
            .IsRequired();

        builder.Property(x => x.AnonymousUserId)
            .HasColumnName("ANONYMOUS_USER_ID")
            .IsRequired();

        builder.Property(x => x.ConnectedAtUtc)
            .HasColumnName("CONNECTED_AT_UTC")
            .IsRequired();

        builder.HasOne(x => x.Application)
            .WithMany()
            .HasForeignKey(x => x.RefApplication)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
