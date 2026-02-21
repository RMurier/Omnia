namespace api.DTOs.Auth
{
    public sealed class AppMemberDto
    {
        public Guid UserId { get; set; }
        public string? Name { get; set; }
        public string? LastName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
