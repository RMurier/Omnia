namespace api.DTOs.Application
{
    public sealed class ApplicationSecretDto
    {
        public Guid Id { get; set; }
        public Guid ApplicationId { get; set; }
        public int Version { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DisabledAt { get; set; }
    }
}
