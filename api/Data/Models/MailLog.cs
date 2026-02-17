namespace api.Data.Models
{
    public sealed class MailLog
    {
        public Guid Id { get; set; }
        public Guid RefApplication { get; set; }
        public string FromAddress { get; set; } = "";
        public string ToAddresses { get; set; } = "[]";
        public string? CcAddresses { get; set; }
        public string? BccAddresses { get; set; }
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
        public string AttachmentsJson { get; set; } = "[]";
        public string Status { get; set; } = "pending";
        public string? ErrorMessage { get; set; }
        public string Fingerprint { get; set; } = "";
        public bool IsPatched { get; set; } = false;
        public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
        public Application? Application { get; set; }
    }
}
