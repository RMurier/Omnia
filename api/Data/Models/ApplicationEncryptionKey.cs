namespace api.Data.Models
{
    public sealed class ApplicationEncryptionKey
    {
        public Guid Id { get; set; }
        public Guid RefApplication { get; set; }
        public string KeyEnc { get; set; } = default!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Application? Application { get; set; } = default!;
    }
}
