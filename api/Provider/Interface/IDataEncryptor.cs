namespace api.Provider.Interface
{
    public interface IDataEncryptor
    {
        Task<string> EncryptAsync(string plaintext, Guid applicationId, CancellationToken ct);
        Task<string> DecryptAsync(string ciphertext, Guid applicationId, CancellationToken ct);
        Task<string> EncryptGuidAsync(Guid value, Guid applicationId, CancellationToken ct);
        Task<Guid> DecryptGuidAsync(string ciphertext, Guid applicationId, CancellationToken ct);
    }
}
