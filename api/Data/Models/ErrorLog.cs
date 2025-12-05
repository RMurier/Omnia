namespace api.Data.Models
{
    public class ErrorLog
    {
        public Guid Id { get; set; }
        public string Message { get; set; } = default!;
        public string StackTrace { get; set; } = default!;
        public DateTime ErrorDate { get; set; } = DateTime.Now;
        public Guid RefApplication { get; set; }
        public Application? Application { get; set; }
    }
}
