using api.DTOs.Application;

namespace api.DTOs.Organization;

public sealed class OrgPendingInvitationDto
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public RoleDto? Role { get; set; }
    public DateTime CreatedAt { get; set; }
}
