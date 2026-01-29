namespace api.Provider.Interface
{
    public interface IHmacNonceStore
    {
        Task<bool> TryUseNonceAsync(Guid appId, string nonce, DateTime expiresAtUtc, CancellationToken ct);
    }
}
