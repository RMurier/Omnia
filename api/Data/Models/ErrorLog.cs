namespace api.Data.Models
{
    public sealed class ErrorLog
    {
        public Guid Id { get; set; }
        public Guid RefApplication { get; set; }
        public string? Category { get; set; }
        public string? Level { get; set; }
        public string Message { get; set; } = "";
        public string Fingerprint { get; set; } = "";
        public string PayloadJson { get; set; } = "{}";
        public bool IsPatched { get; set; } = false;
        public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
        public Application? Application { get; set; }
    }
}
