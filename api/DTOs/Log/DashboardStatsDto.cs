namespace api.DTOs.Log
{
    public sealed class DashboardStatsDto
    {
        public Dictionary<Guid, string> Apps { get; set; } = new();
        public List<DashboardDaySeriesDto> DailySeries { get; set; } = new();
    }
}
