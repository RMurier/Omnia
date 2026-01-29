using System.ComponentModel.DataAnnotations;

namespace api.Data.Models
{
    public sealed class HmacNonce
    {
        public Guid Id { get; set; }
        public Guid RefApplication { get; set; }
        public string Nonce { get; set; } = default!;
        public DateTimeOffset ExpiresAt { get; set; }
        public Application? Application { get; set; }
    }
}
