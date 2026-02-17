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

            var epoch = new DateTime(1970, 1, 5, 0, 0, 0, DateTimeKind.Utc); // Monday

            var aggregated = granularity switch
            {
                Granularity.minute => await q
                    .GroupBy(x => new { x.RefApplication, x.ConnectedAtUtc.Year, x.ConnectedAtUtc.Month, x.ConnectedAtUtc.Day, x.ConnectedAtUtc.Hour, x.ConnectedAtUtc.Minute })
                    .Select(g => new { g.Key.RefApplication, g.Key.Year, g.Key.Month, g.Key.Day, g.Key.Hour, g.Key.Minute, WeekBucket = 0, Count = g.Count() })
                    .ToListAsync(ct),

                Granularity.hour => await q
                    .GroupBy(x => new { x.RefApplication, x.ConnectedAtUtc.Year, x.ConnectedAtUtc.Month, x.ConnectedAtUtc.Day, x.ConnectedAtUtc.Hour })
                    .Select(g => new { g.Key.RefApplication, g.Key.Year, g.Key.Month, g.Key.Day, g.Key.Hour, Minute = 0, WeekBucket = 0, Count = g.Count() })
                    .ToListAsync(ct),

                Granularity.day => await q
                    .GroupBy(x => new { x.RefApplication, x.ConnectedAtUtc.Year, x.ConnectedAtUtc.Month, x.ConnectedAtUtc.Day })
                    .Select(g => new { g.Key.RefApplication, g.Key.Year, g.Key.Month, g.Key.Day, Hour = 0, Minute = 0, WeekBucket = 0, Count = g.Count() })
                    .ToListAsync(ct),

                Granularity.week => await q
                    .GroupBy(x => new { x.RefApplication, WeekBucket = EF.Functions.DateDiffDay(epoch, x.ConnectedAtUtc) / 7 })
                    .Select(g => new { g.Key.RefApplication, Year = 0, Month = 0, Day = 0, Hour = 0, Minute = 0, g.Key.WeekBucket, Count = g.Count() })
                    .ToListAsync(ct),

                Granularity.month => await q
                    .GroupBy(x => new { x.RefApplication, x.ConnectedAtUtc.Year, x.ConnectedAtUtc.Month })
                    .Select(g => new { g.Key.RefApplication, g.Key.Year, g.Key.Month, Day = 0, Hour = 0, Minute = 0, WeekBucket = 0, Count = g.Count() })
                    .ToListAsync(ct),

                Granularity.year => await q
                    .GroupBy(x => new { x.RefApplication, x.ConnectedAtUtc.Year })
                    .Select(g => new { g.Key.RefApplication, g.Key.Year, Month = 0, Day = 0, Hour = 0, Minute = 0, WeekBucket = 0, Count = g.Count() })
                    .ToListAsync(ct),

                _ => await q
                    .GroupBy(x => new { x.RefApplication, x.ConnectedAtUtc.Year, x.ConnectedAtUtc.Month, x.ConnectedAtUtc.Day })
                    .Select(g => new { g.Key.RefApplication, g.Key.Year, g.Key.Month, g.Key.Day, Hour = 0, Minute = 0, WeekBucket = 0, Count = g.Count() })
                    .ToListAsync(ct),
            };

            var results = aggregated.Select(r => new SeriesPointActivityDto
            {
                RefApplication = r.RefApplication,
                Connections = r.Count,
                PeriodStartUtc = granularity == Granularity.week
                    ? epoch.AddDays(r.WeekBucket * 7)
                    : granularity switch
                    {
                        Granularity.minute => new DateTime(r.Year, r.Month, r.Day, r.Hour, r.Minute, 0, DateTimeKind.Utc),
                        Granularity.hour   => new DateTime(r.Year, r.Month, r.Day, r.Hour, 0, 0, DateTimeKind.Utc),
                        Granularity.day    => new DateTime(r.Year, r.Month, r.Day, 0, 0, 0, DateTimeKind.Utc),
                        Granularity.month  => new DateTime(r.Year, r.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                        Granularity.year   => new DateTime(r.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                        _                  => new DateTime(r.Year, r.Month, r.Day, 0, 0, 0, DateTimeKind.Utc),
                    }
            })
            .OrderBy(x => x.PeriodStartUtc)
            .ThenBy(x => x.RefApplication)
            .ToList();

            return results;
        }
    }
}
