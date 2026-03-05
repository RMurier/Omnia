using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using api.DTOs.Activity;
using api.Exceptions;
using api.Interfaces;
using api.Models;
using api.Provider.Interface;
using Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[Controller]")]
    [Authorize(AuthenticationSchemes = "Hmac")]
    public sealed class ActivityController : ControllerBase
    {
        private static readonly Guid OmniaAppId = new("6932a69e-eaa0-4e9c-b4cf-d7a9c6524e4c");
        private static readonly JsonSerializerOptions JsonCamel = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        private readonly IActivity _activity;
        private readonly IStringLocalizer<Shared> _t;
        private readonly AppDbContext _db;
        private readonly IApplicationSecretProvider _secretProvider;
        private readonly IHttpClientFactory _httpClientFactory;

        public ActivityController(
            IActivity activity,
            IStringLocalizer<Shared> t,
            AppDbContext db,
            IApplicationSecretProvider secretProvider,
            IHttpClientFactory httpClientFactory)
        {
            _t = t;
            _activity = activity;
            _db = db;
            _secretProvider = secretProvider;
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("self")]
        [AllowAnonymous]
        public async Task<IActionResult> TrackSelf([FromBody] ActivityDto dto, CancellationToken ct)
        {
            if (dto.AnonymousUserId is null || dto.AnonymousUserId == Guid.Empty)
                return NoContent();

            var latestVersion = await _db.ApplicationSecret
                .AsNoTracking()
                .Where(s => s.RefApplication == OmniaAppId && s.IsActive)
                .OrderByDescending(s => s.Version)
                .Select(s => (int?)s.Version)
                .FirstOrDefaultAsync(ct);

            if (latestVersion is null) return NoContent();

            var sec = await _secretProvider.GetSecretAsync(OmniaAppId, latestVersion.Value, ct);
            if (sec is null || !sec.Value.isActive) return NoContent();

            byte[] secretBytes;
            try { secretBytes = Convert.FromBase64String(sec.Value.secretBase64); }
            catch { return NoContent(); }

            var body = new ActivityDto
            {
                RefApplication = OmniaAppId,
                AnonymousUserId = dto.AnonymousUserId,
                ConnectedAtUtc = DateTime.UtcNow
            };

            var bodyJson = JsonSerializer.Serialize(body, JsonCamel);
            var bodyBytes = Encoding.UTF8.GetBytes(bodyJson);
            var bodyHashHex = Convert.ToHexString(SHA256.HashData(bodyBytes)).ToLowerInvariant();

            var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            var nonce = Guid.NewGuid().ToString();
            var canonical = $"{OmniaAppId}\n{latestVersion.Value}\n{ts}\n{nonce}\nPOST\n/api/activity\n{bodyHashHex}";

            using var hmac = new HMACSHA256(secretBytes);
            var signature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(canonical)));

            var port = HttpContext.Connection.LocalPort;
            using var client = _httpClientFactory.CreateClient();
            using var req = new HttpRequestMessage(HttpMethod.Post, $"http://localhost:{port}/api/activity");
            req.Content = new ByteArrayContent(bodyBytes);
            req.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
            req.Headers.Add(HmacAuthDefaults.HeaderAppId, OmniaAppId.ToString());
            req.Headers.Add(HmacAuthDefaults.HeaderKeyVersion, latestVersion.Value.ToString());
            req.Headers.Add(HmacAuthDefaults.HeaderTimestamp, ts);
            req.Headers.Add(HmacAuthDefaults.HeaderNonce, nonce);
            req.Headers.Add(HmacAuthDefaults.HeaderSignature, signature);

            try { await client.SendAsync(req, ct); }
            catch { }

            return NoContent();
        }

        private Guid? GetUserIdFromClaims()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr, out var userId) ? userId : null;
        }

        [HttpGet("series")]
        [Authorize(AuthenticationSchemes = "Bearer")]
        public async Task<ActionResult<IReadOnlyList<SeriesPointActivityDto>>> GetSeries(
            [FromQuery] Granularity granularity = Granularity.hour,
            [FromQuery] Guid? applicationId = null,
            [FromQuery] string? applicationIds = null,
            [FromQuery] DateTime? fromUtc = null,
            [FromQuery] DateTime? toUtc = null,
            CancellationToken ct = default)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            IReadOnlyList<Guid>? list = null;

            if (!string.IsNullOrWhiteSpace(applicationIds))
            {
                var parts = applicationIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var parsed = new List<Guid>();
                foreach (var p in parts)
                    if (Guid.TryParse(p, out var g)) parsed.Add(g);
                list = parsed;
            }

            var series = await _activity.GetSeries(granularity, applicationId, list, fromUtc, toUtc, userId.Value, ct);
            return Ok(series);
        }

        [HttpPost]
        [Authorize(AuthenticationSchemes = "Hmac")]
        public async Task<ActionResult<ActivityDto>> Create([FromBody] ActivityDto dto, CancellationToken ct)
        {
            try
            {
                var created = await _activity.Create(dto, ct);
                return CreatedAtAction(nameof(GetSeries), new { }, created);
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }
    }
}
