namespace api.DTOs.Log
{
    public sealed class PatchLogsRequest
    {
        public List<Guid> Ids { get; set; } = new();
        public bool Value { get; set; }
    }
}
