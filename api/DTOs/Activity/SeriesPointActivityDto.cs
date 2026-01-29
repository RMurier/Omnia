namespace api.DTOs.Activity
{
    public sealed class SeriesPointActivityDto
    {
        public DateTime PeriodStartUtc { get; set; }
        public long Connections {  get; set; }
        public long UniqueUsers { get;set; }
        public Guid? RefApplication { get; set; }
    }
}
