namespace api.DTOs.Auth
{
    public sealed class DeleteAccountRequest
    {
        public List<AppDecisionDto> AppDecisions { get; set; } = new();
    }
}
