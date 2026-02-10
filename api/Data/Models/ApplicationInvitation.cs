namespace api.Data.Models
{
    public sealed class ApplicationInvitation
    {
        public Guid Id { get; set; }
        public Guid RefApplication { get; set; }
        public string Email { get; set; } = default!; // encrypted
        public Guid RefRoleApplication { get; set; }
        public Guid InvitedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Application? Application { get; set; }
        public RoleApplication? RoleApplication { get; set; }
        public User? InvitedByUser { get; set; }
    }
}
