namespace api.Data.Models
{
    public sealed class ApplicationSecret
    {
        public Guid Id { get; set; }
        public Guid RefApplication { get; set; }
        public int Version { get; set; }
        public string SecretEnc { get; set; } = default!;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Application? Application { get; set; } = default!;
    }
}
