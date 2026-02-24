namespace api.DTOs.Auth
{
    public sealed class AppDecisionDto
    {
        public Guid AppId { get; set; }
        public AppDecisionAction Action { get; set; }
        public Guid? TransferToUserId { get; set; }
    }
}
