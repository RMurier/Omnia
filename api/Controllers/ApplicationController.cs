using System.Security.Claims;
using api.DTOs.Application;
using api.Exceptions;
using api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public sealed class ApplicationController : ControllerBase
    {
        private readonly IApplication _application;
        private readonly IStringLocalizer<Shared> _t;

        public ApplicationController(IApplication application, IStringLocalizer<Shared> t)
        {
            _application = application;
            _t = t;
        }

        private Guid? GetUserIdFromClaims()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr, out var userId) ? userId : null;
        }

        [HttpGet]
        public async Task<ActionResult<List<ApplicationDto>>> GetAll(CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            return Ok(await _application.GetAll(userId.Value, ct));
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ApplicationDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            var item = await _application.GetById(id, userId.Value, ct);
            return item is null
                ? NotFound(new { message = _t["Errors.NotFound"].Value })
                : Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<CreateApplicationResultDto>> Create([FromBody] ApplicationDto dto, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            try
            {
                var created = await _application.Create(dto, userId.Value, ct);
                return CreatedAtAction(nameof(GetById), new { id = created.Application.Id }, created);
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<ApplicationDto>> Update([FromRoute] Guid id, [FromBody] ApplicationDto dto, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            try
            {
                var updated = await _application.Update(id, dto, userId.Value, ct);
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
                var ok = await _application.Delete(id, userId.Value, ct);
                return ok
                    ? NoContent()
                    : NotFound(new { message = _t["Errors.NotFound"].Value });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }

        [HttpGet("{id:guid}/versions")]
        public async Task<ActionResult<List<ApplicationSecretDto>>> GetVersions([FromRoute] Guid id, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            return Ok(await _application.GetVersions(id, userId.Value, ct));
        }

        [HttpPost("{id:guid}/versions")]
        public async Task<ActionResult<object>> CreateVersion([FromRoute] Guid id, CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            try
            {
                var (version, secretBase64) = await _application.CreateVersion(id, userId.Value, ct);
                return Ok(new { Version = version, SecretBase64 = secretBase64 });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }

        [HttpPatch("{id:guid}/versions/{version:int}/active")]
        public async Task<IActionResult> SetVersionActive(
            [FromRoute] Guid id,
            [FromRoute] int version,
            [FromQuery] bool isActive,
            CancellationToken ct)
        {
            var userId = GetUserIdFromClaims();
            if (userId is null)
                return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

            try
            {
                var ok = await _application.SetVersionActive(id, version, isActive, userId.Value, ct);
                return ok
                    ? NoContent()
                    : NotFound(new { message = _t["Errors.NotFound"].Value });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
            }
        }
    }
}
