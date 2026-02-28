namespace api.Data.Models;

public sealed class Organization
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid RefOwner { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastActiveAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User? Owner { get; set; }
    public ICollection<OrganizationMember>? Members { get; set; } = new List<OrganizationMember>();
    public ICollection<Application>? Applications { get; set; } = new List<Application>();
}
