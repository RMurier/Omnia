using System.Security.Cryptography;
using System.Text;

namespace api.Provider.Implementation
{
    public sealed class ApplicationSecretProtector : IApplicationSecretProtector
    {
        private readonly byte[] _masterKey;

        public ApplicationSecretProtector(IConfiguration config)
        {
            var masterB64 = config["Security:MasterKeyEncrypt"];
            if (string.IsNullOrWhiteSpace(masterB64))
                throw new InvalidOperationException("Security:MasterKeyEncrypt manquant");

            _masterKey = Convert.FromBase64String(masterB64);
            if (_masterKey.Length != 32)
                throw new InvalidOperationException("Security:MasterKeyEncrypt doit être une clé AES-256 (32 bytes Base64).");
        }

        public string Protect(string secretPlain, int version)
        {
            var plaintext = Encoding.UTF8.GetBytes(secretPlain);

            var nonce = RandomNumberGenerator.GetBytes(12);
            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[16];

            using (var aes = new AesGcm(_masterKey))
            {
                aes.Encrypt(nonce, plaintext, ciphertext, tag, associatedData: GetAad(version));
            }

            var payload = new byte[12 + 16 + ciphertext.Length];
            Buffer.BlockCopy(nonce, 0, payload, 0, 12);
            Buffer.BlockCopy(tag, 0, payload, 12, 16);
            Buffer.BlockCopy(ciphertext, 0, payload, 28, ciphertext.Length);

            return Convert.ToBase64String(payload);
        }

        public string Unprotect(string secretEnc, int version)
        {
            var payload = Convert.FromBase64String(secretEnc);
            if (payload.Length < 12 + 16 + 1)
                throw new CryptographicException("SecretEnc invalide");

            var nonce = payload.AsSpan(0, 12).ToArray();
            var tag = payload.AsSpan(12, 16).ToArray();
            var ciphertext = payload.AsSpan(28).ToArray();
            var plaintext = new byte[ciphertext.Length];

            using (var aes = new AesGcm(_masterKey))
            {
                aes.Decrypt(nonce, ciphertext, tag, plaintext, associatedData: GetAad(version));
            }

            return Encoding.UTF8.GetString(plaintext);
        }

        private static byte[] GetAad(int version)
            => Encoding.UTF8.GetBytes($"omnia-app-secret:v{version}");
    }
}
