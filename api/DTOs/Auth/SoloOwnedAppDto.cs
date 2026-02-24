namespace api.DTOs.Auth
{
    public sealed class SoloOwnedAppDto
    {
        public Guid AppId { get; set; }
        public string AppName { get; set; } = string.Empty;
        public List<AppMemberDto> Members { get; set; } = new();
    }
}
