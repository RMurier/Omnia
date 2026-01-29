namespace api.DTOs.Activity
{
    public sealed class ActivityDto
    {
        public Guid? Id { get; set; }
        public Guid? RefApplication { get; set; }
        public Guid? AnonymousUserId { get; set; }
        public DateTime? ConnectedAtUtc { get; set; }
    }
}
