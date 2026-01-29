using api.Provider.Interface;
using Data;
using Microsoft.EntityFrameworkCore;

namespace api.Provider.Implementation
{
    public sealed class EfApplicationSecretProvider : IApplicationSecretProvider
    {
        private readonly AppDbContext _db;
        private readonly IApplicationSecretProtector _protector;

        public EfApplicationSecretProvider(AppDbContext db, IApplicationSecretProtector protector)
        {
            _db = db;
            _protector = protector;
        }

        public async Task<(string secretBase64, bool isActive)?> GetSecretAsync(Guid appId, int version, CancellationToken ct)
        {
            var row = await _db.ApplicationSecret
                .AsNoTracking()
                .Where(x => x.RefApplication == appId && x.Version == version)
                .Select(x => new { x.SecretEnc, x.IsActive })
                .FirstOrDefaultAsync(ct);

            if (row is null) return null;

            var secretBase64 = (_protector.Unprotect(row.SecretEnc, version) ?? "").Trim();


            secretBase64 = (secretBase64 ?? "").Trim();

            if (!IsBase64(secretBase64))
                throw new UnauthorizedAccessException("Stored secret is not valid Base64 (after unprotect).");

            return (secretBase64, row.IsActive);
        }

        private static bool IsBase64(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return false;

            if (s.Length % 4 != 0) return false;

            Span<byte> buffer = stackalloc byte[s.Length];
            return Convert.TryFromBase64String(s, buffer, out _);
        }

    }
}
