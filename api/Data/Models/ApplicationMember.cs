namespace api.Data.Models;

public sealed class ApplicationMember
{
    public Guid Id { get; set; }
    public Guid RefApplication { get; set; }
    public Guid RefUser { get; set; }
    public Guid RefRoleApplication { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Application? Application { get; set; }
    public User? User { get; set; }
    public RoleApplication? RoleApplication { get; set; }
}
