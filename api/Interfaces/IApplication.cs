using api.DTOs.Application;

namespace api.Interfaces
{
    public interface IApplication
    {
        Task<IEnumerable<ApplicationDto>> GetAll(Guid userId, CancellationToken ct);
        Task<ApplicationDto?> GetById(Guid id, Guid userId, CancellationToken ct);
        Task<CreateApplicationResultDto> Create(ApplicationDto dto, Guid userId, CancellationToken ct);
        Task<ApplicationDto?> Update(Guid id, ApplicationDto dto, Guid userId, CancellationToken ct);
        Task<bool> Delete(Guid id, Guid userId, CancellationToken ct);
        Task<IEnumerable<ApplicationSecretDto>> GetVersions(Guid applicationId, Guid userId, CancellationToken ct);
        Task<(ApplicationSecretDto version, string secretBase64)> CreateVersion(Guid applicationId, Guid userId, CancellationToken ct);
        Task<bool> SetVersionActive(Guid applicationId, int version, bool isActive, Guid userId, CancellationToken ct);

        // Member management
        Task<IEnumerable<ApplicationMemberDto>> GetMembers(Guid applicationId, Guid userId, CancellationToken ct);
        Task<IEnumerable<PendingInvitationDto>> GetPendingInvitations(Guid applicationId, Guid userId, CancellationToken ct);
        Task<InviteMemberResultDto> InviteMember(Guid applicationId, InviteMemberRequest request, Guid userId, CancellationToken ct);
        Task UpdateMemberRole(Guid applicationId, Guid memberId, UpdateMemberRoleRequest request, Guid userId, CancellationToken ct);
        Task RemoveMember(Guid applicationId, Guid memberId, Guid userId, CancellationToken ct);
        Task CancelInvitation(Guid applicationId, Guid invitationId, Guid userId, CancellationToken ct);
        Task<CheckEmailResultDto> CheckEmail(Guid applicationId, string email, Guid userId, CancellationToken ct);
        Task<IEnumerable<RoleDto>> GetRoles(CancellationToken ct);
    }
}
