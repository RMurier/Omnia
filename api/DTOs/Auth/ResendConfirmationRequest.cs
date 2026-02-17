namespace api.DTOs.Auth
{
    public sealed class ResendConfirmationRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
