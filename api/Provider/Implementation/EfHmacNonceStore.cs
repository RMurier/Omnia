using api.Provider.Interface;
using Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace api.Provider.Implementation
{
    public sealed class EfHmacNonceStore : IHmacNonceStore
    {
        private readonly AppDbContext _db;
        private readonly ILogger<EfHmacNonceStore> _logger;

        public EfHmacNonceStore(AppDbContext db, ILogger<EfHmacNonceStore> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<bool> TryUseNonceAsync(Guid appId, string nonce, DateTime expiresAtUtc, CancellationToken ct)
        {
            _db.HmacNonce.Add(new api.Data.Models.HmacNonce
            {
                Id = Guid.NewGuid(),
                RefApplication = appId,
                Nonce = nonce,
                ExpiresAt = expiresAtUtc
            });

            try
            {
                await _db.SaveChangesAsync(ct);
                return true;
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                _logger.LogWarning(ex, "HMAC nonce replay detected. appId={AppId} nonce={Nonce}", appId, nonce);
                return false;
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Failed to insert nonce (NOT a replay). appId={AppId} nonce={Nonce}", appId, nonce);
                throw;
            }
        }

        private static bool IsUniqueViolation(DbUpdateException ex)
        {
            if (ex.InnerException is SqlException sqlEx)
                return sqlEx.Number is 2627 or 2601;

            return false;
        }
    }
}
