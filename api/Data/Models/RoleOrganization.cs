namespace api.Data.Models;

public sealed class RoleOrganization
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }

    // Navigation properties
    public ICollection<OrganizationMember>? OrganizationMembers { get; set; } = new List<OrganizationMember>();

    // Well-known roles (for seed data and code usage)
    public static class Ids
    {
        public static readonly Guid Owner = new("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a");
        public static readonly Guid Maintainer = new("e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b");
        public static readonly Guid Viewer = new("f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c");
    }

    public static readonly RoleOrganization Owner = new()
    {
        Id = Ids.Owner,
        Name = "Owner",
        Description = "Full access. Can manage members, apps and delete the organization."
    };

    public static readonly RoleOrganization Maintainer = new()
    {
        Id = Ids.Maintainer,
        Name = "Maintainer",
        Description = "Can create and manage apps. Cannot manage organization members."
    };

    public static readonly RoleOrganization Viewer = new()
    {
        Id = Ids.Viewer,
        Name = "Viewer",
        Description = "Read-only access to all organization apps, logs and activities."
    };

    public static readonly RoleOrganization[] All = [Owner, Maintainer, Viewer];
}
