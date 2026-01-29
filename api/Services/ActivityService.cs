using api.Data.Models;
using api.DTOs.Activity;
using api.Helper;
using api.Interfaces;
using Data;
using Microsoft.EntityFrameworkCore;

using api.Exceptions;
using Microsoft.AspNetCore.Http;
namespace api.Services
{
    public sealed class ActivityService : IActivity
    {
        private readonly AppDbContext _db;

        public ActivityService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<ActivityDto>> GetAll(Guid? applicationId, DateTime? fromUtc, DateTime? toUtc, Guid userId, CancellationToken ct)
        {
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_db, userId, ct);

            IQueryable<Activity> q = _db.Activity.AsNoTracking()
                .Where(x => accessibleIds.Contains(x.RefApplication));

            if (applicationId.HasValue && applicationId.Value != Guid.Empty)
                q = q.Where(x => x.RefApplication == applicationId.Value);

            if (fromUtc.HasValue)
                q = q.Where(x => x.ConnectedAtUtc >= DateTime.SpecifyKind(fromUtc.Value, DateTimeKind.Utc));

            if (toUtc.HasValue)
                q = q.Where(x => x.ConnectedAtUtc <= DateTime.SpecifyKind(toUtc.Value, DateTimeKind.Utc));

            return await q
                .OrderByDescending(x => x.ConnectedAtUtc)
                .Select(x => new ActivityDto
                {
                    Id = x.Id,
                    RefApplication = x.RefApplication,
                    AnonymousUserId = x.AnonymousUserId,
                    ConnectedAtUtc = x.ConnectedAtUtc
                })
                .ToListAsync(ct);
        }

        public async Task<ActivityDto> Create(ActivityDto dto, CancellationToken ct)
        {
            if (dto.RefApplication is null || dto.RefApplication == Guid.Empty)
                throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.RefApplicationRequired);

            if (dto.AnonymousUserId is null || dto.AnonymousUserId == Guid.Empty)
                throw new ApiException(StatusCodes.Status400BadRequest, Shared.Keys.Errors.AnonymousUserIdRequired);

            var entity = new Activity
            {
                Id = Guid.NewGuid(),
                RefApplication = dto.RefApplication.Value,
                AnonymousUserId = dto.AnonymousUserId.Value,
                ConnectedAtUtc = (dto.ConnectedAtUtc ?? DateTime.UtcNow).ToUniversalTime()
            };

            _db.Activity.Add(entity);
            await _db.SaveChangesAsync(ct);

            return new ActivityDto
            {
                Id = entity.Id,
                RefApplication = entity.RefApplication,
                AnonymousUserId = entity.AnonymousUserId,
                ConnectedAtUtc = entity.ConnectedAtUtc
            };
        }

        public async Task<IReadOnlyList<SeriesPointActivityDto>> GetSeries(
            Granularity granularity,
            Guid? applicationId,
            IReadOnlyList<Guid>? applicationIds,
            DateTime? fromUtc,
            DateTime? toUtc,
            Guid userId,
            CancellationToken ct)
        {
            var accessibleIds = await ApplicationAccessHelper.GetAccessibleApplicationIdsAsync(_db, userId, ct);

            var q = _db.Activity.AsNoTracking().AsQueryable()
                .Where(x => accessibleIds.Contains(x.RefApplication));

            if (applicationIds is { Count: > 0 })
            {
                var filteredIds = applicationIds.Where(id => accessibleIds.Contains(id)).ToList();
                if (filteredIds.Count > 0)
                    q = q.Where(x => filteredIds.Contains(x.RefApplication));
            }
            else if (applicationId.HasValue && applicationId.Value != Guid.Empty)
            {
                q = q.Where(x => x.RefApplication == applicationId.Value);
            }

            if (fromUtc.HasValue)
                q = q.Where(x => x.ConnectedAtUtc >= DateTime.SpecifyKind(fromUtc.Value, DateTimeKind.Utc));

            if (toUtc.HasValue)
                q = q.Where(x => x.ConnectedAtUtc <= DateTime.SpecifyKind(toUtc.Value, DateTimeKind.Utc));

            var rows = await q
                .Select(x => new { x.RefApplication, x.AnonymousUserId, x.ConnectedAtUtc })
                .ToListAsync(ct);

            var groups = rows
                .GroupBy(r => new { r.RefApplication, Period = GetPeriodStartUtc(r.ConnectedAtUtc, granularity) })
                .Select(g => new SeriesPointActivityDto
                {
                    RefApplication = g.Key.RefApplication,
                    PeriodStartUtc = g.Key.Period,
                    Connections = g.Count(),
                    UniqueUsers = g.Select(x => x.AnonymousUserId).Distinct().Count()
                })
                .OrderBy(x => x.PeriodStartUtc)
                .ThenBy(x => x.RefApplication)
                .ToList();

            return groups;
        }

        private static DateTime GetPeriodStartUtc(DateTime utc, Granularity g)
        {
            var d = utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc);

            return g switch
            {
                Granularity.minute => new DateTime(d.Year, d.Month, d.Day, d.Hour, d.Minute, 0, DateTimeKind.Utc),
                Granularity.hour => new DateTime(d.Year, d.Month, d.Day, d.Hour, 0, 0, DateTimeKind.Utc),
                Granularity.day => new DateTime(d.Year, d.Month, d.Day, 0, 0, 0, DateTimeKind.Utc),
                Granularity.week => StartOfWeekUtc(d, DayOfWeek.Monday),
                Granularity.month => new DateTime(d.Year, d.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                Granularity.year => new DateTime(d.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                _ => new DateTime(d.Year, d.Month, d.Day, 0, 0, 0, DateTimeKind.Utc),
            };
        }

        private static DateTime StartOfWeekUtc(DateTime utc, DayOfWeek startOfWeek)
        {
            var d = utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
            int diff = (7 + (d.DayOfWeek - startOfWeek)) % 7;
            var start = d.Date.AddDays(-diff);
            return new DateTime(start.Year, start.Month, start.Day, 0, 0, 0, DateTimeKind.Utc);
        }
    }
}
