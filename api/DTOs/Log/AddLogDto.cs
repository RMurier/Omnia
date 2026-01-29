namespace api.DTOs.Log
{
    public sealed class AddLogDto
    {
        public Guid? Id { get; set; }
        public Guid? RefApplication { get; set; }
        public string? Category { get; set; }
        public string? Level { get; set; }
        public string? Message { get; set; }
        public string? PayloadJson { get; set; }
        public DateTime? OccurredAtUtc { get; set; }
    }
}
