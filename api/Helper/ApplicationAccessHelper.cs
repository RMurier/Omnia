using api.Data.Models;
using Data;
using Microsoft.EntityFrameworkCore;

namespace api.Helper;

public static class ApplicationAccessHelper
{
    /// <summary>
    /// Get all application IDs the user can access (as owner or member)
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
    /// Check if user can access a specific application (any role)
    /// </summary>
    public static async Task<bool> CanAccessApplicationAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        return await db.ApplicationMember
            .AsNoTracking()
            .AnyAsync(m => m.RefApplication == applicationId && m.RefUser == userId, ct);
    }

    /// <summary>
    /// Check if user is the owner of an application
    /// </summary>
    public static async Task<bool> IsApplicationOwnerAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        return await db.ApplicationMember
            .AsNoTracking()
            .AnyAsync(m =>
                m.RefApplication == applicationId &&
                m.RefUser == userId &&
                m.RefRoleApplication == RoleApplication.Ids.Owner, ct);
    }

    /// <summary>
    /// Check if user has at least Maintainer role (Owner or Maintainer)
    /// </summary>
    public static async Task<bool> CanMaintainApplicationAsync(
        AppDbContext db,
        Guid userId,
        Guid applicationId,
        CancellationToken ct)
    {
        return await db.ApplicationMember
            .AsNoTracking()
            .AnyAsync(m =>
                m.RefApplication == applicationId &&
                m.RefUser == userId &&
                (m.RefRoleApplication == RoleApplication.Ids.Owner ||
                 m.RefRoleApplication == RoleApplication.Ids.Maintainer), ct);
    }

    /// <summary>
    /// Get user's role for an application (null if no access)
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
