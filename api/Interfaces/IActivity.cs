using api.DTOs.Activity;

namespace api.Interfaces
{
    public interface IActivity
    {
        Task<IReadOnlyList<SeriesPointActivityDto>> GetSeries(
            Granularity granularity,
            Guid? applicationId,
            IReadOnlyList<Guid>? applicationIds,
            DateTime? fromUtc,
            DateTime? toUtc,
            Guid userId,
            CancellationToken ct);

        Task<ActivityDto> Create(ActivityDto dto, CancellationToken ct);
    }
}
