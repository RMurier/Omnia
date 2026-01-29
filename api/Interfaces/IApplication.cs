using api.DTOs.Application;

namespace api.Interfaces
{
    public interface IApplication
    {
        Task<IEnumerable<ApplicationDto>> GetAll(Guid userId, CancellationToken ct);
        Task<ApplicationDto?> GetById(Guid id, Guid userId, CancellationToken ct);
        Task<CreateApplicationResultDto> Create(ApplicationDto dto, Guid userId, CancellationToken ct);
        Task<ApplicationDto?> Update(Guid id, ApplicationDto dto, Guid userId, CancellationToken ct);
        Task<bool> Delete(Guid id, Guid userId, CancellationToken ct);
        Task<IEnumerable<ApplicationSecretDto>> GetVersions(Guid applicationId, Guid userId, CancellationToken ct);
        Task<(ApplicationSecretDto version, string secretBase64)> CreateVersion(Guid applicationId, Guid userId, CancellationToken ct);
        Task<bool> SetVersionActive(Guid applicationId, int version, bool isActive, Guid userId, CancellationToken ct);
    }
}
