using System.Security.Cryptography;
using System.Text;
using api.Models;
using api.Provider.Interface;

namespace api.Validator
{
    public sealed class HmacValidator
    {
        private readonly IApplicationSecretProvider _secrets;
        private readonly IHmacNonceStore _nonces;
        private readonly ILogger<HmacValidator> _logger;

        private static readonly TimeSpan MaxSkew = TimeSpan.FromMinutes(5);

        public HmacValidator(IApplicationSecretProvider secrets, IHmacNonceStore nonces, ILogger<HmacValidator> logger)
        {
            _secrets = secrets;
            _nonces = nonces;
            _logger = logger;
        }

        public async Task ValidateAsync(HttpContext ctx, CancellationToken ct)
        {
            var h = ctx.Request.Headers;

            var appIdStr = h[HmacAuthDefaults.HeaderAppId].ToString();
            var verStr = h[HmacAuthDefaults.HeaderKeyVersion].ToString();
            var tsStr = h[HmacAuthDefaults.HeaderTimestamp].ToString();
            var nonce = h[HmacAuthDefaults.HeaderNonce].ToString();
            var sigB64 = h[HmacAuthDefaults.HeaderSignature].ToString();

            if (!Guid.TryParse(appIdStr, out var appId))
                throw new UnauthorizedAccessException("Invalid X-App-Id");

            if (!int.TryParse(verStr, out var version) || version <= 0)
                throw new UnauthorizedAccessException("Invalid X-Key-Version");

            if (!long.TryParse(tsStr, out var ts))
                throw new UnauthorizedAccessException("Invalid X-Timestamp");

            if (string.IsNullOrWhiteSpace(nonce) || nonce.Length < 8 || nonce.Length > 128)
                throw new UnauthorizedAccessException("Invalid X-Nonce");

            if (string.IsNullOrWhiteSpace(sigB64))
                throw new UnauthorizedAccessException("Missing X-Signature");

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (Math.Abs(now - ts) > (long)MaxSkew.TotalSeconds)
                throw new UnauthorizedAccessException("Timestamp out of range");

            // Read exact bytes (NO ambiguity)
            ctx.Request.EnableBuffering();

            byte[] bodyBytes;
            using (var ms = new MemoryStream())
            {
                await ctx.Request.Body.CopyToAsync(ms, ct);
                bodyBytes = ms.ToArray();
                ctx.Request.Body.Position = 0;
            }

            var bodyHashHex = Convert.ToHexString(SHA256.HashData(bodyBytes)).ToLowerInvariant();

            var method = ctx.Request.Method.ToUpperInvariant();

            // IMPORTANT behind gateway: PathBase + Path
            var pathAndQuery = $"{ctx.Request.PathBase}{ctx.Request.Path}{ctx.Request.QueryString}";

            var canonical =
                $"{appId}\n" +
                $"{version}\n" +
                $"{ts}\n" +
                $"{nonce}\n" +
                $"{method}\n" +
                $"{pathAndQuery}\n" +
                $"{bodyHashHex}";

            var sec = await _secrets.GetSecretAsync(appId, version, ct);
            if (sec is null) throw new UnauthorizedAccessException("Unknown application/version");
            if (!sec.Value.isActive) throw new UnauthorizedAccessException("Version inactive");

            if (!Convert.TryFromBase64String(sec.Value.secretBase64.Trim(), new Span<byte>(new byte[sec.Value.secretBase64.Length]), out var _))
                throw new UnauthorizedAccessException("Secret is not valid Base64");

            var secretBytes = Convert.FromBase64String(sec.Value.secretBase64.Trim());
            var expected = ComputeHmacSha256Base64(secretBytes, canonical);

            if (!FixedTimeEqualsB64(expected, sigB64))
            {
                // Debug SAFE (pas le secret)
                _logger.LogWarning(
                    "HMAC invalid. appId={AppId} ver={Ver} method={Method} path={Path} ts={Ts} nonce={Nonce} bodyHash={BodyHash} expected={Expected} received={Received} canonical={Canonical} bodyBytesB64={BodyBytesB64}",
                    appId, version, method, pathAndQuery, ts, nonce, bodyHashHex, expected, sigB64, canonical,
                    Convert.ToBase64String(bodyBytes)
                );

                throw new UnauthorizedAccessException("Invalid signature");
            }

            var ok = await _nonces.TryUseNonceAsync(appId, nonce, DateTime.UtcNow.Add(MaxSkew), ct);
            if (!ok) throw new UnauthorizedAccessException("Nonce already used");
        }

        private static string ComputeHmacSha256Base64(byte[] key, string message)
        {
            using var h = new HMACSHA256(key);
            var mac = h.ComputeHash(Encoding.UTF8.GetBytes(message));
            return Convert.ToBase64String(mac);
        }

        private static bool FixedTimeEqualsB64(string a, string b)
        {
            var ba = Encoding.UTF8.GetBytes(a ?? "");
            var bb = Encoding.UTF8.GetBytes(b ?? "");
            return ba.Length == bb.Length && CryptographicOperations.FixedTimeEquals(ba, bb);
        }
    }
}
