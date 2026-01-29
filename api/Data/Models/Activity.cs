namespace api.Data.Models
{
    public sealed class Activity
    {
        public Guid Id { get; set; }

        public Guid RefApplication { get; set; }

        public Guid AnonymousUserId { get; set; }

        public DateTime ConnectedAtUtc { get; set; }
        public Application? Application { get; set; }
    }
}
