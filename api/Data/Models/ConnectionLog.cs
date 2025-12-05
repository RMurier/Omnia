namespace api.Data.Models
{
    public class ConnectionLog
    {
        public Guid Id { get; set; }
        public string? ComplementaryInformation { get; set; }
        public DateTime ConnectionDate { get; set; } = DateTime.Now;
        public Guid RefApplication { get; set; }
        public bool IsSuccess { get; set; } = false;
        public Application? Application { get; set; }
    }
}
