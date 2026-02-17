using System.Security.Claims;
using api.DTOs.Mail;
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
    public sealed class MailController : ControllerBase
    {
        private readonly IMail _mail;
        private readonly IStringLocalizer<Shared> _t;

        public MailController(IMail mail, IStringLocalizer<Shared> t)
        {
            _mail = mail;
            _t = t;
        }

        private Guid? GetUserIdFromClaims()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr, out var userId) ? userId : null;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<MailLogDto>>> GetAll([FromQuery] Guid? refApplication, [FromQuery] DateTime? fromUtc, [FromQuery] DateTime? toUtc, [FromQuery] string? status, [FromQuery] bool? isPatched, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            var items = await _mail.GetAll(refApplication, fromUtc, toUtc, status, isPatched, userId.Value, ct);
            return Ok(items);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<MailLogDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            var item = await _mail.GetById(id, userId.Value, ct);
            return item is null
                ? NotFound(new { message = _t["Errors.NotFound"].Value })
                : Ok(item);
        }

        [HttpPost]
        [Authorize(AuthenticationSchemes = HmacAuthDefaults.Scheme)]
        public async Task<ActionResult<MailLogDto>> Create([FromBody] AddMailLogDto dto, CancellationToken ct)
        {
            try
            {
                var appIdStr = User.FindFirst(HmacAuthDefaults.ClaimAppId)?.Value;
                if (!Guid.TryParse(appIdStr, out var appId))
                    return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

                dto.RefApplication = appId;

                var created = await _mail.Create(dto, ct);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<MailLogDto>> Update([FromRoute] Guid id, [FromBody] MailLogDto dto, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            try
            {
                var updated = await _mail.Update(id, dto, userId.Value, ct);
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
                var deleted = await _mail.Delete(id, userId.Value, ct);
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
        public async Task<ActionResult<IReadOnlyList<MailLogDto>>> GetDistinct([FromQuery] string? status = null, [FromQuery] string? refsApplication = null, [FromQuery] DateTime? fromUtc = null, [FromQuery] DateTime? toUtc = null, [FromQuery] bool? isPatched = null, CancellationToken ct = default)
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

            var items = await _mail.GetDistinct(status, ids, fromUtc, toUtc, isPatched, userId.Value, ct);

            return Ok(items);
        }

        [HttpPatch("patch")]
        public async Task<ActionResult<List<MailLogDto>>> MarkPatchedMany([FromBody] PatchMailLogsRequest req, CancellationToken ct = default)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            if (req.Ids is null || req.Ids.Count == 0)
                return BadRequest(new { message = _t["Errors.RequiredFields"].Value });

            var updated = await _mail.MarkPatched(req.Ids, req.Value, userId.Value, ct);
            return Ok(updated);
        }
    }
}
