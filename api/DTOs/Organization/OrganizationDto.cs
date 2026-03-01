namespace api.DTOs.Organization;

public sealed class OrganizationDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastActiveAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? MyRole { get; set; }
    public int MemberCount { get; set; }
    public int AppCount { get; set; }
}
