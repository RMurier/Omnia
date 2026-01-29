namespace api.DTOs.Log
{
    public sealed class LogDto
    {
        public Guid? Id { get; set; }

        public Guid? RefApplication { get; set; }

        public string? Category { get; set; }

        public string? Level { get; set; }

        public string? Message { get; set; }

        public string? PayloadJson { get; set; }

        public string? Fingerprint { get; set; }

        public bool? IsPatched { get; set; }

        public DateTime? OccurredAtUtc { get; set; }

        public long? Occurrences { get; set; }
    }
}
