using api.Data.Models;
using api.DTOs.Application;
using api.DTOs.Organization;
using api.Exceptions;
using api.Interfaces;
using api.Provider.Interface;
using Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public sealed class OrganizationService : IOrganization
{
    private readonly AppDbContext _db;
    private readonly IAuth _auth;
    private readonly IConfiguration _config;
    private readonly IMailSender _mailSender;

    public OrganizationService(AppDbContext db, IAuth auth, IConfiguration config, IMailSender mailSender)
    {
        _db = db;
        _auth = auth;
        _config = config;
        _mailSender = mailSender;
    }

    private static readonly HashSet<Guid> ValidOrgRoleIds = new()
    {
        RoleOrganization.Ids.Owner,
        RoleOrganization.Ids.Maintainer,
        RoleOrganization.Ids.Viewer
    };

    // ── Org access helpers ───────────────────────────────────────────────

    private async Task<OrganizationMember?> GetMembershipAsync(Guid orgId, Guid userId, CancellationToken ct)
        => await _db.OrganizationMember
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.RefOrganization == orgId && m.RefUser == userId, ct);

    private async Task<bool> IsOrgOwnerAsync(Guid orgId, Guid userId, CancellationToken ct)
        => await _db.OrganizationMember
            .AsNoTracking()
            .AnyAsync(m => m.RefOrganization == orgId && m.RefUser == userId && m.RefRoleOrganization == RoleOrganization.Ids.Owner, ct);

    private async Task<bool> CanMaintainOrgAsync(Guid orgId, Guid userId, CancellationToken ct)
        => await _db.OrganizationMember
            .AsNoTracking()
            .AnyAsync(m => m.RefOrganization == orgId && m.RefUser == userId &&
                (m.RefRoleOrganization == RoleOrganization.Ids.Owner ||
                 m.RefRoleOrganization == RoleOrganization.Ids.Maintainer), ct);

    private async Task<bool> CanAccessOrgAsync(Guid orgId, Guid userId, CancellationToken ct)
        => await _db.OrganizationMember
            .AsNoTracking()
            .AnyAsync(m => m.RefOrganization == orgId && m.RefUser == userId, ct);

    // ── CRUD ─────────────────────────────────────────────────────────────

    public async Task<IEnumerable<OrganizationDto>> GetAll(Guid userId, CancellationToken ct)
    {
        var orgIds = await _db.OrganizationMember
            .AsNoTracking()
            .Where(m => m.RefUser == userId)
            .Select(m => m.RefOrganization)
            .ToListAsync(ct);

        var orgs = await _db.Organization
            .AsNoTracking()
            .Where(o => orgIds.Contains(o.Id))
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.IsActive,
                o.LastActiveAt,
                o.CreatedAt,
                MemberCount = o.Members!.Count,
                AppCount = o.Applications!.Count
            })
            .ToListAsync(ct);

        // Get roles for this user in each org
        var memberships = await _db.OrganizationMember
            .AsNoTracking()
            .Include(m => m.RoleOrganization)
            .Where(m => m.RefUser == userId && orgIds.Contains(m.RefOrganization))
            .ToListAsync(ct);

        var roleByOrg = memberships.ToDictionary(m => m.RefOrganization, m => m.RoleOrganization?.Name);

        return orgs.Select(o => new OrganizationDto
        {
            Id = o.Id,
            Name = o.Name,
            IsActive = o.IsActive,
            LastActiveAt = o.LastActiveAt,
            CreatedAt = o.CreatedAt,
            MemberCount = o.MemberCount,
            AppCount = o.AppCount,
            MyRole = roleByOrg.TryGetValue(o.Id, out var role) ? role : null
        });
    }

    public async Task<OrganizationDto?> GetById(Guid id, Guid userId, CancellationToken ct)
    {
        if (!await CanAccessOrgAsync(id, userId, ct))
            return null;

        var o = await _db.Organization
            .AsNoTracking()
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.IsActive,
                o.LastActiveAt,
                o.CreatedAt,
                MemberCount = o.Members!.Count,
                AppCount = o.Applications!.Count
            })
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (o is null) return null;

        var membership = await GetMembershipAsync(id, userId, ct);
        var role = membership is not null
            ? await _db.RoleOrganization.AsNoTracking()
                .Where(r => r.Id == membership.RefRoleOrganization)
                .Select(r => r.Name)
                .FirstOrDefaultAsync(ct)
            : null;

        return new OrganizationDto
        {
            Id = o.Id,
            Name = o.Name,
            IsActive = o.IsActive,
            LastActiveAt = o.LastActiveAt,
            CreatedAt = o.CreatedAt,
            MemberCount = o.MemberCount,
            AppCount = o.AppCount,
            MyRole = role
        };
    }

    public async Task<OrganizationDto> Create(CreateOrganizationRequest request, Guid userId, CancellationToken ct)
    {
        var name = (request.Name ?? string.Empty).Trim();
        if (name.Length < 2)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.OrganizationNameTooShort);

        var org = new Organization
        {
            Id = Guid.NewGuid(),
            Name = name,
            RefOwner = userId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var member = new OrganizationMember
        {
            Id = Guid.NewGuid(),
            RefOrganization = org.Id,
            RefUser = userId,
            RefRoleOrganization = RoleOrganization.Ids.Owner,
            CreatedAt = DateTime.UtcNow
        };

        _db.Organization.Add(org);
        _db.OrganizationMember.Add(member);
        await _db.SaveChangesAsync(ct);

        return new OrganizationDto
        {
            Id = org.Id,
            Name = org.Name,
            IsActive = org.IsActive,
            CreatedAt = org.CreatedAt,
            MemberCount = 1,
            AppCount = 0,
            MyRole = "Owner"
        };
    }

    public async Task<OrganizationDto?> Update(Guid id, CreateOrganizationRequest request, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(id, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        var org = await _db.Organization.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (org is null) return null;

        var name = (request.Name ?? string.Empty).Trim();
        if (name.Length < 2)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.OrganizationNameTooShort);

        org.Name = name;
        await _db.SaveChangesAsync(ct);

        return new OrganizationDto
        {
            Id = org.Id,
            Name = org.Name,
            IsActive = org.IsActive,
            LastActiveAt = org.LastActiveAt,
            CreatedAt = org.CreatedAt,
            MyRole = "Owner"
        };
    }

    public async Task<bool> Delete(Guid id, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(id, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        var org = await _db.Organization.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (org is null) return false;

        // Detach all org apps (set RefOrganization = null via SetNull cascade in DB,
        // but we handle ownership transfer here)
        var orgApps = await _db.Application.Where(a => a.RefOrganization == id).ToListAsync(ct);
        foreach (var app in orgApps)
        {
            // Remove all app-level members for this app (org members were managing access)
            var appMembers = await _db.ApplicationMember.Where(m => m.RefApplication == app.Id).ToListAsync(ct);
            _db.ApplicationMember.RemoveRange(appMembers);

            // The org owner becomes app owner
            app.RefOwner = org.RefOwner;
            app.RefOrganization = null;

            // Add org members as app members
            var orgMembers = await _db.OrganizationMember
                .Where(m => m.RefOrganization == id)
                .ToListAsync(ct);

            foreach (var om in orgMembers)
            {
                // Map org role -> app role (same name, different table)
                Guid appRole = om.RefRoleOrganization == RoleOrganization.Ids.Owner ? RoleApplication.Ids.Owner
                    : om.RefRoleOrganization == RoleOrganization.Ids.Maintainer ? RoleApplication.Ids.Maintainer
                    : RoleApplication.Ids.Viewer;

                _db.ApplicationMember.Add(new ApplicationMember
                {
                    Id = Guid.NewGuid(),
                    RefApplication = app.Id,
                    RefUser = om.RefUser,
                    RefRoleApplication = appRole,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        _db.Organization.Remove(org);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    // ── Member management ────────────────────────────────────────────────

    public async Task<IEnumerable<OrganizationMemberDto>> GetMembers(Guid orgId, Guid userId, CancellationToken ct)
    {
        if (!await CanAccessOrgAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

        var members = await _db.OrganizationMember
            .AsNoTracking()
            .Include(m => m.User)
            .Include(m => m.RoleOrganization)
            .Where(m => m.RefOrganization == orgId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        return members.Select(m => new OrganizationMemberDto
        {
            MemberId = m.Id,
            UserId = m.RefUser,
            Email = _auth.DecryptEmail(m.User!.Email),
            Name = _auth.DecryptName(m.User.Name),
            LastName = _auth.DecryptLastName(m.User.LastName),
            Role = m.RoleOrganization is null ? null : new RoleDto
            {
                Id = m.RoleOrganization.Id,
                Name = m.RoleOrganization.Name,
                Description = m.RoleOrganization.Description
            },
            CreatedAt = m.CreatedAt
        });
    }

    public async Task<IEnumerable<OrgPendingInvitationDto>> GetPendingInvitations(Guid orgId, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        var invitations = await _db.OrganizationInvitation
            .AsNoTracking()
            .Include(i => i.RoleOrganization)
            .Where(i => i.RefOrganization == orgId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        return invitations.Select(i => new OrgPendingInvitationDto
        {
            Id = i.Id,
            Email = _auth.DecryptEmail(i.Email),
            Role = i.RoleOrganization is null ? null : new RoleDto
            {
                Id = i.RoleOrganization.Id,
                Name = i.RoleOrganization.Name,
                Description = i.RoleOrganization.Description
            },
            CreatedAt = i.CreatedAt
        });
    }

    public async Task<InviteOrgMemberResultDto> InviteMember(Guid orgId, InviteOrgMemberRequest request, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        if (!ValidOrgRoleIds.Contains(request.RefRoleOrganization))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidRole);

        var org = await _db.Organization.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orgId, ct);
        if (org is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.OrganizationNotFound);

        string plainEmail = (request.Email ?? "").Trim().ToLowerInvariant();
        string encryptedEmail = _auth.EncryptEmail(plainEmail);

        var found = await _auth.FindUserByEmail(plainEmail, ct);

        if (found.HasValue)
        {
            var targetUserId = found.Value.userId;

            bool alreadyMember = await _db.OrganizationMember
                .AnyAsync(m => m.RefOrganization == orgId && m.RefUser == targetUserId, ct);
            if (alreadyMember)
                throw new ApiException(StatusCodes.Status409Conflict, ErrorKeys.OrgMemberAlreadyExists);

            _db.OrganizationMember.Add(new OrganizationMember
            {
                Id = Guid.NewGuid(),
                RefOrganization = orgId,
                RefUser = targetUserId,
                RefRoleOrganization = request.RefRoleOrganization,
                CreatedAt = DateTime.UtcNow
            });

            var existingInv = await _db.OrganizationInvitation
                .FirstOrDefaultAsync(i => i.RefOrganization == orgId && i.Email == encryptedEmail, ct);
            if (existingInv is not null)
                _db.OrganizationInvitation.Remove(existingInv);

            await _db.SaveChangesAsync(ct);

            var roleName = RoleOrganization.All.FirstOrDefault(r => r.Id == request.RefRoleOrganization)?.Name ?? "Member";
            await SendMemberAddedEmail(plainEmail, org.Name, roleName, ct);

            return new InviteOrgMemberResultDto { MemberAdded = true, InvitationSent = false };
        }
        else
        {
            bool invExists = await _db.OrganizationInvitation
                .AnyAsync(i => i.RefOrganization == orgId && i.Email == encryptedEmail, ct);
            if (invExists)
                throw new ApiException(StatusCodes.Status409Conflict, ErrorKeys.OrgInvitationAlreadyPending);

            _db.OrganizationInvitation.Add(new OrganizationInvitation
            {
                Id = Guid.NewGuid(),
                RefOrganization = orgId,
                Email = encryptedEmail,
                RefRoleOrganization = request.RefRoleOrganization,
                InvitedBy = userId,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);

            var roleName = RoleOrganization.All.FirstOrDefault(r => r.Id == request.RefRoleOrganization)?.Name ?? "Member";
            await SendInvitationEmail(plainEmail, org.Name, roleName, ct);

            return new InviteOrgMemberResultDto { MemberAdded = false, InvitationSent = true };
        }
    }

    public async Task UpdateMemberRole(Guid orgId, Guid memberId, UpdateOrgMemberRoleRequest request, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        if (!ValidOrgRoleIds.Contains(request.RefRoleOrganization))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.InvalidRole);

        var member = await _db.OrganizationMember
            .FirstOrDefaultAsync(m => m.Id == memberId && m.RefOrganization == orgId, ct);
        if (member is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.NotFound);

        // If promoting to Owner, demote current owner to Maintainer (exactly 1 owner)
        if (request.RefRoleOrganization == RoleOrganization.Ids.Owner && member.RefRoleOrganization != RoleOrganization.Ids.Owner)
        {
            var currentOwner = await _db.OrganizationMember
                .FirstOrDefaultAsync(m => m.RefOrganization == orgId && m.RefRoleOrganization == RoleOrganization.Ids.Owner, ct);
            if (currentOwner is not null)
                currentOwner.RefRoleOrganization = RoleOrganization.Ids.Maintainer;

            // Update org's RefOwner
            var org = await _db.Organization.FirstOrDefaultAsync(o => o.Id == orgId, ct);
            if (org is not null)
                org.RefOwner = member.RefUser;
        }

        // If removing Owner role, check they are not the last owner
        if (member.RefRoleOrganization == RoleOrganization.Ids.Owner && request.RefRoleOrganization != RoleOrganization.Ids.Owner)
        {
            int ownerCount = await _db.OrganizationMember
                .CountAsync(m => m.RefOrganization == orgId && m.RefRoleOrganization == RoleOrganization.Ids.Owner, ct);
            if (ownerCount <= 1)
                throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.CannotRemoveLastOwner);
        }

        member.RefRoleOrganization = request.RefRoleOrganization;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveMember(Guid orgId, Guid memberId, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        var member = await _db.OrganizationMember
            .FirstOrDefaultAsync(m => m.Id == memberId && m.RefOrganization == orgId, ct);
        if (member is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.NotFound);

        if (member.RefRoleOrganization == RoleOrganization.Ids.Owner)
        {
            int ownerCount = await _db.OrganizationMember
                .CountAsync(m => m.RefOrganization == orgId && m.RefRoleOrganization == RoleOrganization.Ids.Owner, ct);
            if (ownerCount <= 1)
                throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.CannotRemoveLastOwner);
        }

        _db.OrganizationMember.Remove(member);
        await _db.SaveChangesAsync(ct);
    }

    public async Task CancelInvitation(Guid orgId, Guid invitationId, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        var inv = await _db.OrganizationInvitation
            .FirstOrDefaultAsync(i => i.Id == invitationId && i.RefOrganization == orgId, ct);
        if (inv is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.NotFound);

        _db.OrganizationInvitation.Remove(inv);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<CheckEmailResultDto> CheckEmail(Guid orgId, string email, Guid userId, CancellationToken ct)
    {
        if (!await IsOrgOwnerAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgOwner);

        var found = await _auth.FindUserByEmail(email, ct);
        if (!found.HasValue)
            return new CheckEmailResultDto { Exists = false };

        return new CheckEmailResultDto
        {
            Exists = true,
            Name = found.Value.name,
            LastName = found.Value.lastName
        };
    }

    public async Task<IEnumerable<OrgRoleDto>> GetRoles(CancellationToken ct)
    {
        return await _db.RoleOrganization
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new OrgRoleDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description
            })
            .ToListAsync(ct);
    }

    // ── Org apps ─────────────────────────────────────────────────────────

    public async Task<IEnumerable<ApplicationDto>> GetApps(Guid orgId, Guid userId, CancellationToken ct)
    {
        if (!await CanAccessOrgAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.Forbidden);

        var roleName = await _db.OrganizationMember
            .AsNoTracking()
            .Where(m => m.RefOrganization == orgId && m.RefUser == userId)
            .Include(m => m.RoleOrganization)
            .Select(m => m.RoleOrganization!.Name)
            .FirstOrDefaultAsync(ct);

        return await _db.Application
            .AsNoTracking()
            .Where(a => a.RefOrganization == orgId)
            .OrderBy(a => a.Name)
            .Select(a => new ApplicationDto
            {
                Id = a.Id,
                Name = a.Name,
                Url = a.Url,
                IsActive = a.IsActive,
                Description = a.Description,
                LogRetentionValue = a.LogRetentionValue,
                LogRetentionUnit = a.LogRetentionUnit,
                RefOrganization = a.RefOrganization,
                MyRole = roleName
            })
            .ToListAsync(ct);
    }

    // ── App transfer operations ──────────────────────────────────────────

    public async Task TransferAppToOrg(Guid appId, Guid orgId, Guid userId, CancellationToken ct)
    {
        // User must own the app
        var app = await _db.Application.FirstOrDefaultAsync(a => a.Id == appId, ct);
        if (app is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.ApplicationNotFound);

        if (app.RefOwner != userId)
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotAppOwner);

        if (app.RefOrganization.HasValue)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.AppAlreadyInOrg);

        // User must be Owner or Maintainer in the target org
        if (!await CanMaintainOrgAsync(orgId, userId, ct))
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotOrgMaintainerOrOwner);

        var org = await _db.Organization.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orgId, ct);
        if (org is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.OrganizationNotFound);

        // Remove app-level members that are NOT in the org
        var orgMemberUserIds = await _db.OrganizationMember
            .AsNoTracking()
            .Where(m => m.RefOrganization == orgId)
            .Select(m => m.RefUser)
            .ToHashSetAsync(ct);

        var appMembersToRemove = await _db.ApplicationMember
            .Where(m => m.RefApplication == appId && !orgMemberUserIds.Contains(m.RefUser))
            .ToListAsync(ct);

        _db.ApplicationMember.RemoveRange(appMembersToRemove);

        // Remove remaining app-level members (org membership takes over)
        var remainingAppMembers = await _db.ApplicationMember
            .Where(m => m.RefApplication == appId)
            .ToListAsync(ct);
        _db.ApplicationMember.RemoveRange(remainingAppMembers);

        app.RefOrganization = orgId;
        await _db.SaveChangesAsync(ct);
    }

    public async Task TransferAppOwnership(Guid appId, Guid newOwnerUserId, Guid userId, CancellationToken ct)
    {
        var app = await _db.Application.FirstOrDefaultAsync(a => a.Id == appId, ct);
        if (app is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.ApplicationNotFound);

        if (app.RefOwner != userId)
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorKeys.NotAppOwner);

        // Only for personal apps
        if (app.RefOrganization.HasValue)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.AppNotPersonal);

        if (newOwnerUserId == userId)
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorKeys.CannotTransferToSelf);

        // New owner must be a member of the app
        var newOwnerMember = await _db.ApplicationMember
            .FirstOrDefaultAsync(m => m.RefApplication == appId && m.RefUser == newOwnerUserId, ct);
        if (newOwnerMember is null)
            throw new ApiException(StatusCodes.Status404NotFound, ErrorKeys.NotFound);

        // Set new owner's role to Owner
        newOwnerMember.RefRoleApplication = RoleApplication.Ids.Owner;

        // Demote current owner to Maintainer
        var currentOwnerMember = await _db.ApplicationMember
            .FirstOrDefaultAsync(m => m.RefApplication == appId && m.RefUser == userId, ct);
        if (currentOwnerMember is not null)
            currentOwnerMember.RefRoleApplication = RoleApplication.Ids.Maintainer;

        app.RefOwner = newOwnerUserId;
        await _db.SaveChangesAsync(ct);
    }

    // ── Email helpers ────────────────────────────────────────────────────

    private async Task SendMemberAddedEmail(string plainEmail, string orgName, string roleName, CancellationToken ct)
    {
        string fromAddress = _config["SmtpSettings:FromAddress"] ?? "noreply@omnia-monitoring.com";
        string frontendUrl = _config["AppSettings:FrontendUrl"] ?? "https://localhost:5173";

        string body = $@"
<html>
<body style=""font-family: sans-serif; padding: 24px;"">
  <h2>You've been added to {orgName}</h2>
  <p>You have been added as <strong>{roleName}</strong> in the organization <strong>{orgName}</strong> on Omnia.</p>
  <p><a href=""{frontendUrl}/organizations"" style=""display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;"">Go to Omnia</a></p>
</body>
</html>";

        try
        {
            await _mailSender.SendAsync(fromAddress, new[] { plainEmail }, null, null,
                $"You've been added to {orgName}", body, true, ct);
        }
        catch { /* don't fail the invite if email fails */ }
    }

    private async Task SendInvitationEmail(string plainEmail, string orgName, string roleName, CancellationToken ct)
    {
        string fromAddress = _config["SmtpSettings:FromAddress"] ?? "noreply@omnia-monitoring.com";
        string frontendUrl = _config["AppSettings:FrontendUrl"] ?? "https://localhost:5173";

        string body = $@"
<html>
<body style=""font-family: sans-serif; padding: 24px;"">
  <h2>You've been invited to {orgName}</h2>
  <p>You have been invited as <strong>{roleName}</strong> in the organization <strong>{orgName}</strong> on Omnia.</p>
  <p>Create your account to get started:</p>
  <p><a href=""{frontendUrl}/signup"" style=""display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;"">Create my account</a></p>
</body>
</html>";

        try
        {
            await _mailSender.SendAsync(fromAddress, new[] { plainEmail }, null, null,
                $"Invitation to join {orgName} on Omnia", body, true, ct);
        }
        catch { /* don't fail the invite if email fails */ }
    }
}
