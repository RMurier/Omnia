namespace api.DTOs.Mail
{
    public sealed class PatchMailLogsRequest
    {
        public List<Guid> Ids { get; set; } = new();
        public bool Value { get; set; }
    }
}
