namespace api.DTOs.Auth
{
    public sealed class ExportDataDto
    {
        public string Email { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? LastName { get; set; }
        public DateTime? TermsAcceptedAt { get; set; }
        public string? TermsVersion { get; set; }
        public DateTime ExportedAt { get; set; }
    }
}
