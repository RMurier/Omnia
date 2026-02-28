namespace api.Data.Models;

public sealed class OrganizationMember
{
    public Guid Id { get; set; }
    public Guid RefOrganization { get; set; }
    public Guid RefUser { get; set; }
    public Guid RefRoleOrganization { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Organization? Organization { get; set; }
    public User? User { get; set; }
    public RoleOrganization? RoleOrganization { get; set; }
}
