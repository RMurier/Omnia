namespace api.DTOs.Log
{
    public sealed class DashboardDaySeriesDto
    {
        public string Date { get; set; } = null!;
        public Guid RefApplication { get; set; }
        public long Count { get; set; }
    }
}
