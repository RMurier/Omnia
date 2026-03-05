using api.DTOs.Application;
using api.DTOs.Organization;

namespace api.Interfaces;

public interface IOrganization
{
    Task<IEnumerable<OrganizationDto>> GetAll(Guid userId, CancellationToken ct);
    Task<OrganizationDto?> GetById(Guid id, Guid userId, CancellationToken ct);
    Task<OrganizationDto> Create(CreateOrganizationRequest request, Guid userId, CancellationToken ct);
    Task<OrganizationDto?> Update(Guid id, CreateOrganizationRequest request, Guid userId, CancellationToken ct);
    Task<bool> Delete(Guid id, Guid userId, CancellationToken ct);

    // Member management
    Task<IEnumerable<OrganizationMemberDto>> GetMembers(Guid orgId, Guid userId, CancellationToken ct);
    Task<IEnumerable<OrgPendingInvitationDto>> GetPendingInvitations(Guid orgId, Guid userId, CancellationToken ct);
    Task<InviteOrgMemberResultDto> InviteMember(Guid orgId, InviteOrgMemberRequest request, Guid userId, CancellationToken ct);
    Task UpdateMemberRole(Guid orgId, Guid memberId, UpdateOrgMemberRoleRequest request, Guid userId, CancellationToken ct);
    Task RemoveMember(Guid orgId, Guid memberId, Guid userId, CancellationToken ct);
    Task CancelInvitation(Guid orgId, Guid invitationId, Guid userId, CancellationToken ct);
    Task<CheckEmailResultDto> CheckEmail(Guid orgId, string email, Guid userId, CancellationToken ct);
    Task<IEnumerable<OrgRoleDto>> GetRoles(CancellationToken ct);

    // Org apps
    Task<IEnumerable<ApplicationDto>> GetApps(Guid orgId, Guid userId, CancellationToken ct);

    // App transfer operations
    Task TransferAppToOrg(Guid appId, Guid orgId, Guid userId, CancellationToken ct);
    Task TransferAppOwnership(Guid appId, Guid newOwnerUserId, Guid userId, CancellationToken ct);
}
