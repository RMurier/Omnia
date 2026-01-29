using api.DTOs.Log;

namespace api.Interfaces
{
    public interface ILog
    {
        Task<IReadOnlyList<LogDto>> GetAll(Guid? refApplication, DateTime? fromUtc, DateTime? toUtc, string? category, string? level, bool? isPatched, Guid userId, CancellationToken ct);

        Task<LogDto?> GetById(Guid id, Guid userId, CancellationToken ct);

        Task<LogDto> Create(AddLogDto dto, CancellationToken ct);

        Task<LogDto?> Update(Guid id, LogDto dto, Guid userId, CancellationToken ct);

        Task<bool> Delete(Guid id, Guid userId, CancellationToken ct);

        Task<IReadOnlyList<LogDto>> GetDistinct(string? category, string? level, Guid[]? refsApplication, DateTime? fromUtc, DateTime? toUtc, bool? isPatched, Guid userId, CancellationToken ct);

        Task<List<LogDto>> MarkPatched(IEnumerable<Guid> ids, bool isPatched, Guid userId, CancellationToken ct);
    }
}
