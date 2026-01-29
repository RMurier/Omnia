using api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<Application> Application { get; set; }
        public DbSet<ErrorLog> Log { get; set; }
        public DbSet<Activity> Activity { get; set; }
        public DbSet<User> User { get; set; }
        public DbSet<ApplicationSecret> ApplicationSecret { get; set; }
        public DbSet<HmacNonce> HmacNonce { get; set; }
        public DbSet<RoleApplication> RoleApplication { get; set; }
        public DbSet<ApplicationMember> ApplicationMember { get; set; }
        public DbSet<ApplicationEncryptionKey> ApplicationEncryptionKey { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}