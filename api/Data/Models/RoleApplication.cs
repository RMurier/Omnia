namespace api.Data.Models;

public sealed class RoleApplication
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }

    // Navigation properties
    public ICollection<ApplicationMember>? ApplicationMembers { get; set; } = new List<ApplicationMember>();

    // Well-known roles (for seed data and code usage)
    public static class Ids
    {
        public static readonly Guid Owner = new("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
        public static readonly Guid Maintainer = new("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");
        public static readonly Guid Viewer = new("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f");
    }

    public static readonly RoleApplication Owner = new()
    {
        Id = Ids.Owner,
        Name = "Owner",
        Description = "Full access. Can manage members and delete the application."
    };

    public static readonly RoleApplication Maintainer = new()
    {
        Id = Ids.Maintainer,
        Name = "Maintainer",
        Description = "Can edit the application and manage logs/activities."
    };

    public static readonly RoleApplication Viewer = new()
    {
        Id = Ids.Viewer,
        Name = "Viewer",
        Description = "Read-only access to the application, logs and activities."
    };

    public static readonly RoleApplication[] All = [Owner, Maintainer, Viewer];
}
