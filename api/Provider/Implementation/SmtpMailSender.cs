using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using api.Provider.Interface;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace api.Provider.Implementation
{
    public sealed class SmtpSettings
    {
        public string Host { get; set; } = "";
        public int Port { get; set; } = 587;
        public string Password { get; set; } = "";
        public string FromAddress { get; set; } = "";
        public string FromName { get; set; } = "Omnia";
    }

    public sealed class SmtpMailSender : IMailSender
    {
        private readonly SmtpSettings _settings;

        public SmtpMailSender(IOptions<SmtpSettings> options)
        {
            _settings = options.Value;
        }

        public async Task SendAsync(
            string from,
            IEnumerable<string> to,
            IEnumerable<string>? cc,
            IEnumerable<string>? bcc,
            string subject,
            string body,
            bool isHtml,
            CancellationToken ct,
            string? plainTextBody = null)
        {
            var message = new MimeMessage();

            var senderAddress = string.IsNullOrWhiteSpace(from) ? _settings.FromAddress : from;
            message.From.Add(new MailboxAddress(_settings.FromName, senderAddress));

            foreach (var addr in to)
            {
                if (!string.IsNullOrWhiteSpace(addr))
                    message.To.Add(MailboxAddress.Parse(addr.Trim()));
            }

            if (cc is not null)
            {
                foreach (var addr in cc)
                {
                    if (!string.IsNullOrWhiteSpace(addr))
                        message.Cc.Add(MailboxAddress.Parse(addr.Trim()));
                }
            }

            if (bcc is not null)
            {
                foreach (var addr in bcc)
                {
                    if (!string.IsNullOrWhiteSpace(addr))
                        message.Bcc.Add(MailboxAddress.Parse(addr.Trim()));
                }
            }

            message.Subject = subject;

            var bodyBuilder = new BodyBuilder();
            if (isHtml)
                bodyBuilder.HtmlBody = body;
            else
                bodyBuilder.TextBody = body;

            if (plainTextBody is not null)
                bodyBuilder.TextBody = plainTextBody;

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            client.CheckCertificateRevocation = false;
            client.ServerCertificateValidationCallback = ValidateServerCertificate;
            await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls, ct);
            await client.AuthenticateAsync(_settings.FromAddress, _settings.Password, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
        }
        private static bool ValidateServerCertificate(
            object sender,
            X509Certificate? certificate,
            X509Chain? chain,
            SslPolicyErrors sslPolicyErrors)
        {
            if (sslPolicyErrors == SslPolicyErrors.None)
                return true;

            // Accept when the only chain error is an untrusted root certificate.
            // OVH (ssl0.ovh.net) sends a root CA that some Linux/Docker CA stores
            // do not include. The rest of the chain (signatures, expiry, hostname)
            // is still validated by SslStream before this callback runs.
            if (sslPolicyErrors == SslPolicyErrors.RemoteCertificateChainErrors
                && chain is not null
                && chain.ChainStatus.Length > 0
                && chain.ChainStatus.All(s => s.Status == X509ChainStatusFlags.UntrustedRoot))
            {
                return true;
            }

            return false;
        }
    }
}
