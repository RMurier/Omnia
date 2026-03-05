namespace api.DTOs.Organization;

public sealed class TransferAppOwnershipRequest
{
    public Guid NewOwnerUserId { get; set; }
}
