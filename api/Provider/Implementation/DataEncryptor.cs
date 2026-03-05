using System.Security.Cryptography;
using System.Text;
using api.Provider.Interface;
using Microsoft.Extensions.Caching.Memory;

namespace api.Provider.Implementation
{
    public sealed class DataEncryptor : IDataEncryptor
    {
        private readonly IApplicationEncryptionKeyProvider _keyProvider;
        private readonly IMemoryCache _cache;
        private readonly byte[] _systemKey;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

        public DataEncryptor(IApplicationEncryptionKeyProvider keyProvider, IMemoryCache cache, IConfiguration config)
        {
            _keyProvider = keyProvider;
            _cache = cache;

            var systemKeyB64 = config["Security:SystemMailKey"];
            if (string.IsNullOrWhiteSpace(systemKeyB64))
                throw new InvalidOperationException("Security:SystemMailKey is missing");

            _systemKey = Convert.FromBase64String(systemKeyB64);
            if (_systemKey.Length != 32)
                throw new InvalidOperationException("Security:SystemMailKey must be a 32-byte AES-256 key (base64-encoded)");
        }

        public async Task<string> EncryptAsync(string plaintext, Guid applicationId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(plaintext))
                return string.Empty;

            var key = await GetCachedKeyAsync(applicationId, ct);
            return Encrypt(plaintext, key);
        }

        public async Task<string> DecryptAsync(string ciphertext, Guid applicationId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(ciphertext))
                return string.Empty;

            var key = await GetCachedKeyAsync(applicationId, ct);
            return Decrypt(ciphertext, key);
        }

        public async Task<string> EncryptGuidAsync(Guid value, Guid applicationId, CancellationToken ct)
        {
            return await EncryptAsync(value.ToString(), applicationId, ct);
        }

        public async Task<Guid> DecryptGuidAsync(string ciphertext, Guid applicationId, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(ciphertext))
                return Guid.Empty;

            var decrypted = await DecryptAsync(ciphertext, applicationId, ct);
            return Guid.TryParse(decrypted, out var guid) ? guid : Guid.Empty;
        }

        public string EncryptSystem(string plaintext)
        {
            if (string.IsNullOrEmpty(plaintext)) return string.Empty;
            return Encrypt(plaintext, _systemKey);
        }

        public string DecryptSystem(string ciphertext)
        {
            if (string.IsNullOrEmpty(ciphertext)) return string.Empty;
            return Decrypt(ciphertext, _systemKey);
        }

        private async Task<byte[]> GetCachedKeyAsync(Guid applicationId, CancellationToken ct)
        {
            var cacheKey = $"app-enc-key:{applicationId}";

            if (_cache.TryGetValue(cacheKey, out byte[]? key) && key is not null)
                return key;

            key = await _keyProvider.GetKeyAsync(applicationId, ct);
            _cache.Set(cacheKey, key, CacheDuration);

            return key;
        }

        private static string Encrypt(string plaintext, byte[] key)
        {
            var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
            var nonce = RandomNumberGenerator.GetBytes(12);
            var ciphertext = new byte[plaintextBytes.Length];
            var tag = new byte[16];

            using var aes = new AesGcm(key, 16);
            aes.Encrypt(nonce, plaintextBytes, ciphertext, tag);

            var payload = new byte[12 + 16 + ciphertext.Length];
            Buffer.BlockCopy(nonce, 0, payload, 0, 12);
            Buffer.BlockCopy(tag, 0, payload, 12, 16);
            Buffer.BlockCopy(ciphertext, 0, payload, 28, ciphertext.Length);

            return Convert.ToBase64String(payload);
        }

        private static string Decrypt(string ciphertextB64, byte[] key)
        {
            var payload = Convert.FromBase64String(ciphertextB64);
            if (payload.Length < 12 + 16 + 1)
                throw new CryptographicException("Invalid ciphertext format");

            var nonce = payload.AsSpan(0, 12).ToArray();
            var tag = payload.AsSpan(12, 16).ToArray();
            var ciphertext = payload.AsSpan(28).ToArray();
            var plaintext = new byte[ciphertext.Length];

            using var aes = new AesGcm(key, 16);
            aes.Decrypt(nonce, ciphertext, tag, plaintext);

            return Encoding.UTF8.GetString(plaintext);
        }
    }
}
