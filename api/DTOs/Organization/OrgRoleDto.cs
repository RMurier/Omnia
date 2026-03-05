namespace api.DTOs.Organization;

public sealed class OrgRoleDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}
