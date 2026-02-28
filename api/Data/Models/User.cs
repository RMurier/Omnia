using System.ComponentModel.DataAnnotations.Schema;

namespace api.Data.Models
{
    public sealed class User
    {
        public Guid Id { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string? Name { get; set; }
        public string? LastName { get; set; }
        public string? Password { get; set; } = default!;
        public string? Salt { get; set; } = default!;
        public bool EmailConfirmed { get; set; }
        public string? EmailConfirmationToken { get; set; }
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiresAt { get; set; }
        public string? PendingPassword { get; set; }
        public string? PendingSalt { get; set; }
        public string? PasswordChangeToken { get; set; }
        public DateTime? PasswordChangeTokenExpiresAt { get; set; }
        public DateTime? PasswordChangedAt { get; set; }
        public DateTime? TermsAcceptedAt { get; set; }
        public string? TermsVersion { get; set; }
        [NotMapped]
        public string? AccessToken { get; set; } = default!;
        [NotMapped]
        public string? RefreshToken { get; set; } = default!;

        // Navigation properties
        public ICollection<Application>? OwnedApplications { get; set; } = new List<Application>();
        public ICollection<ApplicationMember>? ApplicationMemberships { get; set; } = new List<ApplicationMember>();
        public ICollection<Organization>? OwnedOrganizations { get; set; } = new List<Organization>();
        public ICollection<OrganizationMember>? OrganizationMemberships { get; set; } = new List<OrganizationMember>();
    }
}
