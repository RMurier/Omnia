namespace api.DTOs.Mail
{
    public sealed class AddMailLogDto
    {
        public Guid? RefApplication { get; set; }
        public string? FromAddress { get; set; }
        public string? ToAddresses { get; set; }
        public string? CcAddresses { get; set; }
        public string? BccAddresses { get; set; }
        public string? Subject { get; set; }
        public string? Body { get; set; }
        public string? AttachmentsJson { get; set; }
        public string? Status { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime? SentAtUtc { get; set; }
        public bool SendMail { get; set; } = false;
        public bool IsHtml { get; set; } = true;
    }
}
