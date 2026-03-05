namespace api.DTOs.Application
{
    public sealed class ApplicationMemberDto
    {
        public Guid MemberId { get; set; }
        public Guid UserId { get; set; }
        public string? Email { get; set; }
        public string? Name { get; set; }
        public string? LastName { get; set; }
        public RoleDto? Role { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public sealed class RoleDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
    }

    public sealed class InviteMemberRequest
    {
        public string Email { get; set; } = string.Empty;
        public Guid RefRoleApplication { get; set; }
    }

    public sealed class UpdateMemberRoleRequest
    {
        public Guid RefRoleApplication { get; set; }
    }

    public sealed class InviteMemberResultDto
    {
        public bool MemberAdded { get; set; }
        public bool InvitationSent { get; set; }
    }

    public sealed class CheckEmailResultDto
    {
        public bool Exists { get; set; }
        public string? Name { get; set; }
        public string? LastName { get; set; }
    }

    public sealed class PendingInvitationDto
    {
        public Guid Id { get; set; }
        public string? Email { get; set; }
        public RoleDto? Role { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
