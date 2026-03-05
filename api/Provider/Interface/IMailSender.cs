namespace api.Provider.Interface
{
    public interface IMailSender
    {
        Task SendAsync(
            string from,
            IEnumerable<string> to,
            IEnumerable<string>? cc,
            IEnumerable<string>? bcc,
            string subject,
            string body,
            bool isHtml,
            CancellationToken ct,
            string? plainTextBody = null);
    }
}
