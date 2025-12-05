using api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<Application> Application { get; set; }
        public DbSet<ErrorLog> ErrorLog { get; set; }
        public DbSet<ConnectionLog> ConnectionLog { get; set; }
        public DbSet<User> UtilisatUsereur { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}