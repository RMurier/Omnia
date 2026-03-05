namespace api.Provider.Interface
{
    public interface IApplicationEncryptionKeyProvider
    {
        Task<byte[]> GetKeyAsync(Guid applicationId, CancellationToken ct);
        Task<Guid> CreateKeyAsync(Guid applicationId, CancellationToken ct);
    }
}
