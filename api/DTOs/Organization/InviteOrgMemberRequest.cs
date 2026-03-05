namespace api.DTOs.Organization;

public sealed class InviteOrgMemberRequest
{
    public string? Email { get; set; }
    public Guid RefRoleOrganization { get; set; }
}
