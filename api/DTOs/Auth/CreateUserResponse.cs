namespace api.DTOs.Auth
{
    public sealed class CreateUserResponse
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
    }
}
