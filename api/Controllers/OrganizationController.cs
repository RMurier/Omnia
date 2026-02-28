using System.Security.Claims;
using api.DTOs.Organization;
using api.Exceptions;
using api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class OrganizationController : ControllerBase
{
    private readonly IOrganization _organization;
    private readonly IStringLocalizer<Shared> _t;

    public OrganizationController(IOrganization organization, IStringLocalizer<Shared> t)
    {
        _organization = organization;
        _t = t;
    }

    private Guid? GetUserIdFromClaims()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdStr, out var userId) ? userId : null;
    }

    // ── Org CRUD ─────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<ActionResult<List<OrganizationDto>>> GetAll(CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        return Ok(await _organization.GetAll(userId.Value, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrganizationDto>> GetById([FromRoute] Guid id, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        var item = await _organization.GetById(id, userId.Value, ct);
        return item is null ? NotFound(new { message = _t["Errors.NotFound"].Value }) : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<OrganizationDto>> Create([FromBody] CreateOrganizationRequest request, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            var result = await _organization.Create(request, userId.Value, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<OrganizationDto>> Update([FromRoute] Guid id, [FromBody] CreateOrganizationRequest request, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            var result = await _organization.Update(id, request, userId.Value, ct);
            return result is null ? NotFound(new { message = _t["Errors.NotFound"].Value }) : Ok(result);
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
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            var deleted = await _organization.Delete(id, userId.Value, ct);
            return deleted ? NoContent() : NotFound(new { message = _t["Errors.NotFound"].Value });
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    // ── Roles ─────────────────────────────────────────────────────────────

    [HttpGet("roles")]
    [AllowAnonymous]
    public async Task<ActionResult<List<OrgRoleDto>>> GetRoles(CancellationToken ct)
        => Ok(await _organization.GetRoles(ct));

    // ── Members ───────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<List<OrganizationMemberDto>>> GetMembers([FromRoute] Guid id, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            return Ok(await _organization.GetMembers(id, userId.Value, ct));
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpGet("{id:guid}/members/check-email")]
    public async Task<IActionResult> CheckEmail([FromRoute] Guid id, [FromQuery] string email, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            return Ok(await _organization.CheckEmail(id, email, userId.Value, ct));
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpGet("{id:guid}/invitations")]
    public async Task<ActionResult<List<OrgPendingInvitationDto>>> GetPendingInvitations([FromRoute] Guid id, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            return Ok(await _organization.GetPendingInvitations(id, userId.Value, ct));
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpPost("{id:guid}/members/invite")]
    public async Task<ActionResult<InviteOrgMemberResultDto>> InviteMember([FromRoute] Guid id, [FromBody] InviteOrgMemberRequest request, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            return Ok(await _organization.InviteMember(id, request, userId.Value, ct));
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpPatch("{id:guid}/members/{memberId:guid}/role")]
    public async Task<IActionResult> UpdateMemberRole([FromRoute] Guid id, [FromRoute] Guid memberId, [FromBody] UpdateOrgMemberRoleRequest request, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            await _organization.UpdateMemberRole(id, memberId, request, userId.Value, ct);
            return NoContent();
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember([FromRoute] Guid id, [FromRoute] Guid memberId, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            await _organization.RemoveMember(id, memberId, userId.Value, ct);
            return NoContent();
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpDelete("{id:guid}/invitations/{invitationId:guid}")]
    public async Task<IActionResult> CancelInvitation([FromRoute] Guid id, [FromRoute] Guid invitationId, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            await _organization.CancelInvitation(id, invitationId, userId.Value, ct);
            return NoContent();
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    // ── Org apps ──────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/apps")]
    public async Task<IActionResult> GetApps([FromRoute] Guid id, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            return Ok(await _organization.GetApps(id, userId.Value, ct));
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    // ── App transfer operations ──────────────────────────────────────────

    [HttpPost("transfer-app-to-org")]
    public async Task<IActionResult> TransferAppToOrg([FromBody] TransferAppToOrgRequest request, [FromQuery] Guid appId, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            await _organization.TransferAppToOrg(appId, request.RefOrganization, userId.Value, ct);
            return NoContent();
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }

    [HttpPost("transfer-app-ownership")]
    public async Task<IActionResult> TransferAppOwnership([FromBody] TransferAppOwnershipRequest request, [FromQuery] Guid appId, CancellationToken ct)
    {
        var userId = GetUserIdFromClaims();
        if (userId is null) return Unauthorized(new { message = _t["Errors.Unauthorized"].Value });

        try
        {
            await _organization.TransferAppOwnership(appId, request.NewOwnerUserId, userId.Value, ct);
            return NoContent();
        }
        catch (ApiException ex)
        {
            return StatusCode(ex.StatusCode, new { message = _t[ex.Key].Value });
        }
    }
}
