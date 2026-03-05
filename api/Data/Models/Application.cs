namespace api.Data.Models
{
    public sealed class Application
    {
        public Guid Id { get; set; }
        public Guid RefOwner { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Name { get; set; }
        public string? Url { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int LogRetentionValue { get; set; } = 7;
        public string LogRetentionUnit { get; set; } = "days";
        public Guid? RefOrganization { get; set; }

        // Navigation properties
        public Organization? Organization { get; set; }
        public User? Owner { get; set; }
        public ICollection<ApplicationSecret>? Secrets { get; set; } = new List<ApplicationSecret>();
        public ICollection<ApplicationMember>? Members { get; set; } = new List<ApplicationMember>();
    }
}
