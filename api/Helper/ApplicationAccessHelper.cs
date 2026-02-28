using api.Data.Models;
using Data;
using Microsoft.EntityFrameworkCore;

namespace api.Helper;

public static class ApplicationAccessHelper
{
    /// <summary>
    /// Get all personal application IDs the user can access (as owner or member, not in any org)
    /// </summary>
    public static async Task<HashSet<Guid>> GetAccessibleApplicationIdsAsync(
        AppDbContext db,
        Guid userId,
        CancellationToken ct)
    {
        var memberAppIds = await db.ApplicationMember
            .AsNoTracking()
            .Where(m => m.RefUser == userId)
            .Select(m => m.RefApplication)
            .ToListAsync(ct);

        return memberAppIds.ToHashSet();
    }

    /// <summary>
    /// Check if user can access a specific application (any role).
    /// For org apps, checks org membership instead of app-level membership.
    /// </summary>
    public static async Task<bool> CanAccessApplicationAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        var app = await db.Application
            .AsNoTracking()
            .Select(a => new { a.Id, a.RefOrganization })
            .FirstOrDefaultAsync(a => a.Id == applicationId, ct);

        if (app is null) return false;

        if (app.RefOrganization.HasValue)
        {
            return await db.OrganizationMember
                .AsNoTracking()
                .AnyAsync(m => m.RefOrganization == app.RefOrganization.Value && m.RefUser == userId, ct);
        }

        return await db.ApplicationMember
            .AsNoTracking()
            .AnyAsync(m => m.RefApplication == applicationId && m.RefUser == userId, ct);
    }

    /// <summary>
    /// Check if user is the owner of an application.
    /// For org apps, checks if user is org Owner.
    /// </summary>
    public static async Task<bool> IsApplicationOwnerAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        var app = await db.Application
            .AsNoTracking()
            .Select(a => new { a.Id, a.RefOrganization })
            .FirstOrDefaultAsync(a => a.Id == applicationId, ct);

        if (app is null) return false;

        if (app.RefOrganization.HasValue)
        {
            return await db.OrganizationMember
                .AsNoTracking()
                .AnyAsync(m =>
                    m.RefOrganization == app.RefOrganization.Value &&
                    m.RefUser == userId &&
                    m.RefRoleOrganization == RoleOrganization.Ids.Owner, ct);
        }

        return await db.ApplicationMember
            .AsNoTracking()
            .AnyAsync(m =>
                m.RefApplication == applicationId &&
                m.RefUser == userId &&
                m.RefRoleApplication == RoleApplication.Ids.Owner, ct);
    }

    /// <summary>
    /// Check if user has at least Maintainer role (Owner or Maintainer).
    /// For org apps, checks org-level role.
    /// </summary>
    public static async Task<bool> CanMaintainApplicationAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        var app = await db.Application
            .AsNoTracking()
            .Select(a => new { a.Id, a.RefOrganization })
            .FirstOrDefaultAsync(a => a.Id == applicationId, ct);

        if (app is null) return false;

        if (app.RefOrganization.HasValue)
        {
            return await db.OrganizationMember
                .AsNoTracking()
                .AnyAsync(m =>
                    m.RefOrganization == app.RefOrganization.Value &&
                    m.RefUser == userId &&
                    (m.RefRoleOrganization == RoleOrganization.Ids.Owner ||
                     m.RefRoleOrganization == RoleOrganization.Ids.Maintainer), ct);
        }

        return await db.ApplicationMember
            .AsNoTracking()
            .AnyAsync(m =>
                m.RefApplication == applicationId &&
                m.RefUser == userId &&
                (m.RefRoleApplication == RoleApplication.Ids.Owner ||
                 m.RefRoleApplication == RoleApplication.Ids.Maintainer), ct);
    }

    /// <summary>
    /// Get user's effective role name for an application.
    /// For org apps, returns the org-level role name.
    /// </summary>
    public static async Task<string?> GetUserRoleNameAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        var app = await db.Application
            .AsNoTracking()
            .Select(a => new { a.Id, a.RefOrganization })
            .FirstOrDefaultAsync(a => a.Id == applicationId, ct);

        if (app is null) return null;

        if (app.RefOrganization.HasValue)
        {
            var orgMember = await db.OrganizationMember
                .AsNoTracking()
                .Include(m => m.RoleOrganization)
                .FirstOrDefaultAsync(m => m.RefOrganization == app.RefOrganization.Value && m.RefUser == userId, ct);
            return orgMember?.RoleOrganization?.Name;
        }

        var appMember = await db.ApplicationMember
            .AsNoTracking()
            .Include(m => m.RoleApplication)
            .FirstOrDefaultAsync(m => m.RefApplication == applicationId && m.RefUser == userId, ct);
        return appMember?.RoleApplication?.Name;
    }

    /// <summary>
    /// Get user's role for an application (null if no access). For personal apps only.
    /// </summary>
    public static async Task<RoleApplication?> GetUserRoleAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        var member = await db.ApplicationMember
            .AsNoTracking()
            .Include(m => m.RoleApplication)
            .FirstOrDefaultAsync(m => m.RefApplication == applicationId && m.RefUser == userId, ct);

        return member?.RoleApplication;
    }
}
