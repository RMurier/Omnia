using System.Security.Claims;
using api.DTOs.Log;
using api.Exceptions;
using api.Interfaces;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public sealed class LogController : ControllerBase
    {
        private readonly ILog _log;
        private readonly IStringLocalizer<Shared> _t;

        public LogController(ILog log, IStringLocalizer<Shared> t)
        {
            _log = log;
            _t = t;
        }

        private Guid? GetUserIdFromClaims()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr, out var userId) ? userId : null;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<LogDto>>> GetAll([FromQuery] Guid? refApplication, [FromQuery] DateTime? fromUtc, [FromQuery] DateTime? toUtc, [FromQuery] string? category, [FromQuery] string? level, [FromQuery] bool? isPatched, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            var items = await _log.GetAll(refApplication, fromUtc, toUtc, category, level, isPatched, userId.Value, ct);
            return Ok(items);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<LogDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            var item = await _log.GetById(id, userId.Value, ct);
            return item is null
                ? NotFound(new { message = _t["Errors.NotFound"].Value })
                : Ok(item);
        }

        [HttpPost]
        [Authorize(AuthenticationSchemes = HmacAuthDefaults.Scheme)]
        public async Task<ActionResult<LogDto>> Create([FromBody] AddLogDto dto, CancellationToken ct)
        {
            try
            {
                var appIdStr = User.FindFirst(HmacAuthDefaults.ClaimAppId)?.Value;
                if (!Guid.TryParse(appIdStr, out var appId))
                    return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

                dto.RefApplication = appId;

                var created = await _log.Create(dto, ct);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<LogDto>> Update([FromRoute] Guid id, [FromBody] LogDto dto, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            try
            {
                var updated = await _log.Update(id, dto, userId.Value, ct);
                return updated is null
                    ? NotFound(new { message = _t["Errors.NotFound"].Value })
                    : Ok(updated);
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            try
            {
                var deleted = await _log.Delete(id, userId.Value, ct);
                return deleted
                    ? NoContent()
                    : NotFound(new { message = _t["Errors.NotFound"].Value });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }

        [HttpGet("distinct")]
        public async Task<ActionResult<IReadOnlyList<LogDto>>> GetDistinct([FromQuery] string? category = null, [FromQuery] string? level = null, [FromQuery] string? refsApplication = null, [FromQuery] DateTime? fromUtc = null, [FromQuery] DateTime? toUtc = null, [FromQuery] bool? isPatched = null, CancellationToken ct = default)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            Guid[]? ids = null;

            if (!string.IsNullOrWhiteSpace(refsApplication))
            {
                ids = refsApplication
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(Guid.Parse)
                    .ToArray();
            }

            var items = await _log.GetDistinct(category, level, ids, fromUtc, toUtc, isPatched, userId.Value, ct);

            return Ok(items);
        }

        [HttpPatch("patch")]
        public async Task<ActionResult<List<LogDto>>> MarkPatchedMany([FromBody] PatchLogsRequest req, CancellationToken ct = default)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            if (req.Ids is null || req.Ids.Count == 0)
                return BadRequest(new { message = _t["Errors.RequiredFields"].Value });

            var updated = await _log.MarkPatched(req.Ids, req.Value, userId.Value, ct);
            return Ok(updated);
        }
    }
}
