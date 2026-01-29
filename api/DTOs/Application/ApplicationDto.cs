namespace api.DTOs.Application
{
    public sealed class ApplicationDto
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string? Url { get; set; }
        public bool? IsActive { get; set; }
        public string? Description { get; set; }
        public int? CurrentKeyVersion { get; set; }
    }
}
