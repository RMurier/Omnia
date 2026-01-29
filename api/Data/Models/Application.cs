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

        // Navigation properties
        public User? Owner { get; set; }
        public ICollection<ApplicationSecret>? Secrets { get; set; } = new List<ApplicationSecret>();
        public ICollection<ApplicationMember>? Members { get; set; } = new List<ApplicationMember>();
    }
}
