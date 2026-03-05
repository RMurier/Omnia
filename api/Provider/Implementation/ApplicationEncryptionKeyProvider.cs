using System.Security.Cryptography;
using System.Text;
using api.Data.Models;
using api.Provider.Interface;
using Data;
using Microsoft.EntityFrameworkCore;

namespace api.Provider.Implementation
{
    public sealed class ApplicationEncryptionKeyProvider : IApplicationEncryptionKeyProvider
    {
        private readonly AppDbContext _context;
        private readonly byte[] _masterKey;

        public ApplicationEncryptionKeyProvider(AppDbContext context, IConfiguration config)
        {
            _context = context;

            var masterB64 = config["Security:MasterKeyEncrypt"];
            if (string.IsNullOrWhiteSpace(masterB64))
                throw new InvalidOperationException("Security:MasterKeyEncrypt is missing");

            _masterKey = Convert.FromBase64String(masterB64);
            if (_masterKey.Length != 32)
                throw new InvalidOperationException("Security:MasterKeyEncrypt must be a 32-byte AES-256 key");
        }

        public async Task<byte[]> GetKeyAsync(Guid applicationId, CancellationToken ct)
        {
            var encKey = await _context.ApplicationEncryptionKey
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.RefApplication == applicationId, ct);

            if (encKey is null)
                throw new InvalidOperationException($"No encryption key found for application {applicationId}");

            return DecryptKey(encKey.KeyEnc);
        }

        public async Task<Guid> CreateKeyAsync(Guid applicationId, CancellationToken ct)
        {
            var exists = await _context.ApplicationEncryptionKey
                .AnyAsync(x => x.RefApplication == applicationId, ct);

            if (exists)
                throw new InvalidOperationException($"Encryption key already exists for application {applicationId}");

            var rawKey = RandomNumberGenerator.GetBytes(32);
            var encryptedKey = EncryptKey(rawKey);

            var entity = new ApplicationEncryptionKey
            {
                Id = Guid.NewGuid(),
                RefApplication = applicationId,
                KeyEnc = encryptedKey,
                CreatedAt = DateTime.UtcNow
            };

            _context.ApplicationEncryptionKey.Add(entity);
            await _context.SaveChangesAsync(ct);

            return entity.Id;
        }

        private string EncryptKey(byte[] plainKey)
        {
            var nonce = RandomNumberGenerator.GetBytes(12);
            var ciphertext = new byte[plainKey.Length];
            var tag = new byte[16];

            using var aes = new AesGcm(_masterKey, 16);
            aes.Encrypt(nonce, plainKey, ciphertext, tag, GetAad());

            var payload = new byte[12 + 16 + ciphertext.Length];
            Buffer.BlockCopy(nonce, 0, payload, 0, 12);
            Buffer.BlockCopy(tag, 0, payload, 12, 16);
            Buffer.BlockCopy(ciphertext, 0, payload, 28, ciphertext.Length);

            return Convert.ToBase64String(payload);
        }

        private byte[] DecryptKey(string encryptedKey)
        {
            var payload = Convert.FromBase64String(encryptedKey);
            if (payload.Length < 12 + 16 + 1)
                throw new CryptographicException("Invalid encrypted key format");

            var nonce = payload.AsSpan(0, 12).ToArray();
            var tag = payload.AsSpan(12, 16).ToArray();
            var ciphertext = payload.AsSpan(28).ToArray();
            var plaintext = new byte[ciphertext.Length];

            using var aes = new AesGcm(_masterKey, 16);
            aes.Decrypt(nonce, ciphertext, tag, plaintext, GetAad());

            return plaintext;
        }

        private static byte[] GetAad()
            => Encoding.UTF8.GetBytes("omnia-app-encryption-key");
    }
}
