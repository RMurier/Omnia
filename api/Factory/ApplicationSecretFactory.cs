using System.Security.Cryptography;
using api.Provider.Interface;

namespace api.Factories
{
    public static class ApplicationSecretFactory
    {
        public static (string secretBase64, string secretEnc) CreateProtectedSecret(IApplicationSecretProtector protector, int version)
        {
            // 32 bytes => AES-256 / HMAC key size standard
            var secretBytes = RandomNumberGenerator.GetBytes(32);

            // Base64 propre (sans espaces, sans quotes)
            var secretBase64 = Convert.ToBase64String(secretBytes);

            // Optionnel: assert dev
            if (!Convert.TryFromBase64String(secretBase64, new Span<byte>(new byte[32]), out _))
                throw new InvalidOperationException("Generated secret is not valid Base64 (should never happen).");

            var secretEnc = protector.Protect(secretBase64, version);

            return (secretBase64, secretEnc);
        }
    }
}
