namespace api.Provider.Interface
{
    public interface IApplicationSecretProvider
    {
        Task<(string secretBase64, bool isActive)?> GetSecretAsync(Guid appId, int version, CancellationToken ct);
    }
}
