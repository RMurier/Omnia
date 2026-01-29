using System.Security.Claims;
using api.DTOs.Activity;
using api.Exceptions;
using api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[Controller]")]
    [Authorize(AuthenticationSchemes = "Hmac")]
    public sealed class ActivityController : ControllerBase
    {
        private readonly IActivity _activity;
        private readonly IStringLocalizer<Shared> _t;

        public ActivityController(IActivity activity, IStringLocalizer<Shared> t)
        {
            _t = t;
            _activity = activity;
        }

        private Guid? GetUserIdFromClaims()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr, out var userId) ? userId : null;
        }

        [HttpGet]
        [Authorize(AuthenticationSchemes = "Bearer")]
        public async Task<ActionResult<IReadOnlyList<ActivityDto>>> GetAll(
            [FromQuery] Guid? applicationId,
            [FromQuery] DateTime? fromUtc,
            [FromQuery] DateTime? toUtc,
            CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            var items = await _activity.GetAll(applicationId, fromUtc, toUtc, userId.Value, ct);
            return Ok(items);
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
                return CreatedAtAction(nameof(GetAll), new { }, created);
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }
    }
}
