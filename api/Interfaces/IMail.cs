using api.DTOs.Mail;

namespace api.Interfaces
{
    public interface IMail
    {
        Task<IReadOnlyList<MailLogDto>> GetAll(Guid? refApplication, DateTime? fromUtc, DateTime? toUtc, string? status, bool? isPatched, Guid userId, CancellationToken ct);

        Task<MailLogDto?> GetById(Guid id, Guid userId, CancellationToken ct);

        Task<MailLogDto> Create(AddMailLogDto dto, CancellationToken ct);

        Task<MailLogDto?> Update(Guid id, MailLogDto dto, Guid userId, CancellationToken ct);

        Task<bool> Delete(Guid id, Guid userId, CancellationToken ct);

        Task<IReadOnlyList<MailLogDto>> GetDistinct(string? status, Guid[]? refsApplication, DateTime? fromUtc, DateTime? toUtc, bool? isPatched, Guid userId, CancellationToken ct);

        Task<List<MailLogDto>> MarkPatched(IEnumerable<Guid> ids, bool isPatched, Guid userId, CancellationToken ct);

        Task SendAndLogAsync(
            string from,
            IEnumerable<string> to,
            IEnumerable<string>? cc,
            IEnumerable<string>? bcc,
            string subject,
            string htmlBody,
            string? plainTextBody,
            CancellationToken ct);
    }
}
