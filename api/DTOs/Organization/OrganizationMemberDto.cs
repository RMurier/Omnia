using api.DTOs.Application;

namespace api.DTOs.Organization;

public sealed class OrganizationMemberDto
{
    public Guid MemberId { get; set; }
    public Guid UserId { get; set; }
    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? LastName { get; set; }
    public RoleDto? Role { get; set; }
    public DateTime CreatedAt { get; set; }
}
