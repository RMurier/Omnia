namespace api.DTOs.Auth
{
    public sealed class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? LastName { get; set; }
    }
}
