namespace api.Data.Models;

public sealed class OrganizationInvitation
{
    public Guid Id { get; set; }
    public Guid RefOrganization { get; set; }
    public string Email { get; set; } = default!; // encrypted
    public Guid RefRoleOrganization { get; set; }
    public Guid InvitedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Organization? Organization { get; set; }
    public RoleOrganization? RoleOrganization { get; set; }
    public User? InvitedByUser { get; set; }
}
