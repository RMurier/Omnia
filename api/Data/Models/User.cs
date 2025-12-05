using System.ComponentModel.DataAnnotations.Schema;

namespace api.Data.Models
{
    public class User
    {
        public Guid Id { get; set; } = default!;
        public string Username { get; set; } = default!;
        public string? Password { get; set; } = default!;
        public string? Salt { get; set; } = default!;
        [NotMapped]
        public string? AccessToken { get; set; } = default!;
        [NotMapped]
        public string? RefreshToken { get; set; } = default!;
    }
}
